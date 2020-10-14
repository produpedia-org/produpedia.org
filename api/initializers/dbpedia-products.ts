import fs from 'fs';
import readLine from 'readline';
import 'reflect-metadata';
import { createConnection, getMongoRepository } from 'typeorm';
import Attribute from '../models/Attribute';
import PrimaryProductDatum from '../models/PrimaryProductDatum';
import Product, { PrimaryProductData } from '../models/Product';
import { query } from './sparql';

let lineno = 0;

(async () => {
    await createConnection();

    console.info('Deleting all products');
    // @ts-ignore
    await getMongoRepository(Product).deleteMany({});

    console.info('Lookup all attributes');
    const attributes = await Attribute.find({});
    const attribute_by_name: { [name: string]: Attribute } = attributes.reduce((all: any, a) => {
        all[a.name] = a;
        return all;
    }, {});

    console.info('Saving new products and getting and saving their data');

    const rl = readLine.createInterface({
        input: fs.createReadStream('/b/ls/dbpedia_import/products.txt'),
    });
    const lines_batch_size = 10;
    let lines_batch = [];
    for await (const line of rl) {
        lineno++;
        // if (i > 100)
        //     process.exit(0);

        // if (lineno < 99501)
        //     continue;

        // sparql interaction happens in batches, because that speeds up the whole
        // process significantly (virtuoso computation is the bottleneck here):
        // without batching, each iteration takes about
        // 3-5ms for querying, 0.2ms processing and 1ms saving. With 4kk products,
        // this yields in over 6 hours total time.
        // benchmarks on a 3.5 GHz machine:
        // BATCH SIZE    4k lines   query/row   process/row    save/row
        // 1             27 sec     4 ms        0.3 ms ~       1 ms
        // 5             14 sec
        // 10            12 sec     2.1 ms      0.03 ms ~      0.7 ms
        // 100           14 sec
        // 1000          > 30, didnt complete
        // 10@2.2GHz     16 sec+
        // So querying for about 10 resources at the same time seems to be most
        // performant. Total time is about 3.5 hours.

        lines_batch.push(line);
        if (lines_batch.length < lines_batch_size)
            continue;

        if (lineno % 500 === 0)
            console.log(Math.round(lineno / 4107547 * 1000) / 10 + '% ' + line);

        // const resource_sanitized = sparql_uri_escape(resource);

        const product_infos = lines_batch.map((batch_line) => {
            try {
                return JSON.parse(batch_line);
            } catch (e) {
                console.log('could not parse json', batch_line);
                return null;
            }
        }).filter(Boolean);

        lines_batch = [];

        const sql_conditions = product_infos.map(info => `
        { select "${info[0]}" as ?subject ?predicate ?object {
            <http://dbpedia.org/resource/${encodeURI(info[0])}> ?predicate ?object
        } }`).join(' UNION ');
        const sql = `select ?subject ?predicate ?object { ${sql_conditions} }`;

        const results = await query(sql, undefined, true);

        const products = product_infos.map((info) => {
            const [resource, { categories, aliases, thumbnail, depiction }] = info;

            const product_results = results.filter(r => r.subject === resource);

            const label = product_results.find(r => r.predicate === 'rdfs:label')?.object.replace(/^(.+)@[a-z]+/, '$1');
            if (!label) {
                console.log('label missing', resource);
                return null;
            }

            const data: PrimaryProductData = product_results
                .filter(r => r.predicate.match(/^dbo:/))
                .reduce((all: PrimaryProductData, r) => {
                    const attribute_name = r.predicate.replace(/^dbo:/, '');
                    const attribute = attribute_by_name[attribute_name];
                    if (!attribute)
                        throw new Error(`could not find attribute ${r.predicate} in attributes for resource ${resource}`);
                    // if (!categories.includes(attribute.category))
                    //     throw new Error(`attribute ${r.predicate} from resource ${resource} belongs to category ${attribute.category} but that category wasnt found in the resources categories ${JSON.stringify(categories)}`);
                    let value;
                    switch (attribute.type) {
                    case 'boolean':
                        value = Boolean(r.object); break;
                    case 'date':
                        value = new Date(r.object);
                        if (isNaN(value.getTime()))
                            console.warn(`value ${r.object} => ${value} for attribute ${attribute.name} from resource ${resource} is not a valid date`);
                        break;
                    case 'number':
                        value = Number(r.object);
                        if (Number.isNaN(value))
                            console.warn(`value ${r.object} => ${value} for attribute ${attribute.name} from resource ${resource} is NaN`);
                        if (attribute.min != null && value < attribute.min || attribute.max != null && value > attribute.max)
                            console.warn(`value ${r.object} => ${value} for attribute ${attribute.name} from resource ${resource} is outside of the allowed boundaries ${attribute.min} to ${attribute.max}`);
                        if (!attribute.float && value % 1 !== 0)
                            console.warn(`value ${r.object} => ${value} for attribute ${attribute.name} from resource ${resource} should be int but is float`);
                        break;
                    case 'resource':
                        // if (!r.object.match(/^dbr:/))
                        //     console.warn(`value ${r.object} for attribute ${attribute.name} from resource ${resource} should be a resource but isnt`);
                        value = r.object; break;
                    case 'string':
                    default:
                        value = r.object;
                    }
                    all[attribute_name] = new PrimaryProductDatum({
                        value,
                        source: 'dbpedia',
                        user: 'system',
                    });
                    return all;
                }, {});
            data.label = new PrimaryProductDatum({
                value: label,
                user: 'system',
                verified: true,
            });
            if (thumbnail) {
                data.thumbnail = new PrimaryProductDatum({
                    value: thumbnail,
                    user: 'system',
                    verified: true,
                });
            }
            if (depiction) {
                data.depiction = new PrimaryProductDatum({
                    value: depiction,
                    user: 'system',
                    verified: true,
                });
            }

            return new Product({
                categories,
                name: resource.replace(/^dbr:/, ''),
                aliases,
                source: 'dbpedia',
                data,
            });
        }).filter((p): p is Product => !!p);

        await Product.save(products);

        // console.log(products);
        // process.exit(0);
    }

    process.exit(0);
})();

process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
    console.log('lineno', lineno);
    process.exit(2);
});
