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
    await getMongoRepository(Product).deleteMany({});

    console.info('Lookup all attributes');
    const attributes = await Attribute.find({});
    const attribute_by_name: { [name: string]: Attribute } = attributes.reduce((all: any, a) => {
        all[a.name] = a;
        return all;
    }, {});

    console.info('Saving new products and getting and saving their data');

    const rl = readLine.createInterface({
        input: fs.createReadStream('/b/ls/dbpedia_import/products2.txt'),
    });
    // See explanation below
    const lines_batch_size = 10;
    let lines_batch = [];
    for await (const line of rl) {
        lineno++;
        // console.log(lineno)
        // if (i > 100)
        //     process.exit(0);

        // if (lineno < 4018874)
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

        if (lineno % 500 === 0)
            console.log(Math.round(lineno / 4107547 * 1000) / 10 + '% ' + line);

        lines_batch.push(line);
        if (lines_batch.length < lines_batch_size)
            continue;

        // const resource_sanitized = sparql_uri_escape(resource);

        const product_infos = lines_batch.map((batch_line) => {
            try {
                return JSON.parse(batch_line);
            } catch (e) {
                console.log('could not parse json', batch_line);
                return null;
            }
        }).filter(Boolean)
        // remove after next get_products generation when categories:[] will be
        // no more in products*.txt
        .filter(info => info[1].categories.length);

        lines_batch = [];

        // Tests showed that it is generally not necessary to also query for the ?p/?o's of
        // each product's aliases (redirects). These may contain values too but only very
        // rarely, mostly data errors.
        // select ?p, count(?s) as ?count { ?s dbo:wikiPageRedirects ?r; ?p ?o } group by ?p order by ?count
        // Especially when only taking the dbo props into consideration, as
        // dbp:props are not queried anyway (filter predicate match dbo: below).
        // Also see get_products.coffee: Colline
        const sql_conditions = product_infos.map(info => `
        { select "${info[0]}" as ?subject ?predicate ?object {
            <http://dbpedia.org/resource/${info[0]}> ?predicate ?object
        } }`).join(' UNION ');
        // ^ regarding escaping: & " ' must not be escaped above or nothing will be returned.
        // Could be because it is already escaped somewhere else
        const sql = `select ?subject ?predicate ?object { ${sql_conditions} }`;

        const results = await query(sql, undefined, true);

        const products = product_infos.map((info) => {
            const [resource, { categories, aliases, thumbnail, depiction }] = info;

            const product_results = results.filter(r => r.subject === resource);

            const label = product_results.find(r => r.predicate === 'rdfs:label')?.object.replace(/^(.+)@[a-z]+/, '$1');
            if (!label) {
                // Happens sometimes, e.g. https://dbpedia.org/page/Diamond_Crush. No idea why but probably
                // related to some other dataset not included in the dump. Skip
                return null;
            }

            const data: PrimaryProductData = product_results
                .filter(r => r.predicate.match(/^dbo:/))
                .filter(r => ! r.predicate.match(/\./)) // dbo:drugs.com. only very few present so simply ignoring these for now
                .reduce((all: PrimaryProductData, r) => {
                    const attribute_name = r.predicate.replace(/^dbo:/, '');
                    const attribute = attribute_by_name[attribute_name];
                    if (!attribute)
                        throw new Error(`could not find attribute ${r.predicate} in attributes for resource ${resource}`);
                    // Then and again, a product has a value for an attribute that is an unknown attribute
                    // to this category or its recursive parents, ex. ?s dbo:director ?o ; a dbo:VideoGame.
                    // These seem to be *mostly* data errors, as I found with a couple demo categories
                    // and queries like this one select max(?d) as ?domain ?p as ?bad_predicates ?t as ?type count(distinct ?s) as ?bad_predicates_count { ?s a dbo:City . ?s ?p ?o . ?s a ?t . { ?p a owl:DatatypeProperty } UNION { ?p a owl:ObjectProperty } . ?p rdfs:domain ?d . filter (?d != dbo:City && ?d != dbo:Settlement && ?d != dbo:PopulatedPlace && ?d != dbo:Place) } group by ?p ?t having(count(distinct ?s) > 25) order by ?p ?t 
                    // so should probably ignored here (they would never be shown anyway)
                    // if (!categories.includes(attribute.category)) <- but this doesnt cut it,
                    // needs to check for parent categories as well: TODO but not urgent.
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
                categories: categories.map((c: string) => c[0].toLowerCase() + c.slice(1)),
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
