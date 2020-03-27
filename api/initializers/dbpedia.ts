import { readFileSync } from 'fs';
import 'reflect-metadata';
import { createConnection, getMongoRepository } from 'typeorm';
import Attribute, { AttributeType } from '../models/Attribute';
import PrimaryProductDatum from '../models/PrimaryProductDatum';
import Product from '../models/Product';
import { error } from '../utils';
import { parse_product_datum_value_or_throw } from '../routers/product-router';
import { ProductDatumValue } from '../models/ProductDatum';

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
const attributes_by_predicate: { [predicate: string]: Attribute } = {};

error('Storing attributes');
const attributes = predicates
    .map(p => predicate_infos[p])
    .filter(Boolean)
    .map((p) => {
        const { predicate, mapTo, ...rest } = p;
        const attr = new Attribute({
            subject: 'Smartphone',
            interest: 0,
            ...rest,
            type: p.type === 'resource' ? 'string' : p.type,
        });
        attributes_by_predicate[p.predicate] = attr;
        return attr;
    });

(async () => {
    try {
        await createConnection();

        error('Deleting all attributes');
        await getMongoRepository(Attribute).deleteMany({});

        error('Adding attributes');
        // console.debug(attributes);
        await Attribute.save(attributes);

        error('Deleting all products');
        await getMongoRepository(Product).deleteMany({});

        error('Storing products');
        const products = rows.map((r: any) => {
            const data = predicates.reduce((all: any, p: string) => {
                if (r[p]) {
                    const attr = attributes_by_predicate[p];
                    if (!attr)
                        return all;
                    const value: ProductDatumValue = parse_product_datum_value_or_throw(r[p], attr);
                    all[attr._id.toHexString()] = new PrimaryProductDatum({
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
