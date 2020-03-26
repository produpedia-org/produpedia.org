import 'reflect-metadata';
import connection from '../connection';
import Attribute from '../models/Attribute';
import Product from '../models/Product';
import { error } from '../utils';
import { readFileSync } from 'fs';
import PrimaryProductDatum from '../models/PrimaryProductDatum';
import { getMongoRepository } from 'typeorm';

if (process.argv.length !== 4) {
    error('Syntax: dbpedia.ts [path-to-data-json] [path-to-mapping-json]');
    process.exit(1);
}

const data_json = JSON.parse(readFileSync(process.argv[2], 'utf-8'));
const rows = data_json.rows;
const predicates: string[] = data_json.predicates.filter((p: string) => ! p.match(/:/));
const mapping_json = JSON.parse(readFileSync(process.argv[3], 'utf-8'));
const predicate_infos = mapping_json.relevant_predicates.reduce((all: any, p: any) => {
    all[p.predicate] = p;
    return all;
}, {});

error('Storing attributes');
const attributes = predicates
    .map(p => predicate_infos[p])
    .filter(Boolean)
    .map(p => new Attribute({
        subject: 'Smartphone',
        interest: 0,
        ...p,
        type: p.type === 'resource' ? 'string' : p.type,
    }));

(async () => {
    try {
        await connection;

        error('Deleting all attributes');
        await getMongoRepository(Attribute).deleteMany({});

        error('Adding attributes');
        // console.debug(attributes);
        await Attribute.save(attributes);

        error('Deleting all products');
        await getMongoRepository(Product).deleteMany({});

        error('Storing products');
        const products = rows.map((r: any) => {
            const data = attributes.reduce((all: any, attr: any) => {
                if (r[attr.predicate]) {
                    let value = r[attr.predicate];
                    // TODO: this kind of validation and transformation stuf belongs into custom product datum validators
                    if (attr.type === 'number') {
                        if (attr.float)
                            value = Number.parseFloat(value);
                        else
                            value = Number.parseInt(value, 10);
                    }
                    all[attr._id] = new PrimaryProductDatum({
                        value,
                        verified: false,
                        source: 'dbpedia',
                        user: 'system',
                    });
                }
                return all;
            }, {});
            return new Product({
                subject: 'Smartphone',
                name: r.resource,
                data,
                verified: false,
            });
        });

        error('Adding products');
        await Product.insert(products);

        error('Finished');
        process.exit(0);
    } catch (e) {
        error(e);
        process.exit(2);
    }
})();
