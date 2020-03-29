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
const labels = data_json.labels;
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

const resource_to_source = (resource: string) =>
    `http://dbpedia.org/resource/${resource.split(':')[1]}`;

const label_to_name = (label: string) =>
    label.replace(/@[a-z]+/, '');

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
            const source = resource_to_source(r.resource);
            const data = predicates.reduce((all: any, p: string) => {
                if (r[p]) {
                    const attr = attributes_by_predicate[p];
                    if (!attr)
                        return all;
                    let value: ProductDatumValue = parse_product_datum_value_or_throw(r[p], attr);
                    if (!value)
                        throw new Error('value is not set: ' + r[p]);
                    // Change value to label of value using labels object, if it is a resource with label,
                    // for each array element or for the value directly if not array,
                    if (attr.type === 'string') {
                        const labelify_value = (single_value: AttributeType) => {
                            // This is still a little messy. Might be an idea to
                            // not only store the value(object) in downloader/structure transformer,
                            // but also the specific value type
                            if (typeof single_value === 'string' && single_value.includes(':') && labels[single_value])
                                return label_to_name(labels[single_value]);
                            return single_value;
                        };
                        if (Array.isArray(value)) {
                            value = value.map(single_value => labelify_value(single_value));
                        } else {
                            value = labelify_value(value);
                        }
                    }
                    all[attr._id.toHexString()] = new PrimaryProductDatum({
                        value,
                        verified: false,
                        source,
                        user: 'system',
                    });
                }
                return all;
            }, {});
            return new Product({
                subject: 'Smartphone',
                name: label_to_name(r['rdfs:label']),
                source,
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
