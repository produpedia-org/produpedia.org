import { readFileSync } from 'fs';
import 'reflect-metadata';
import { createConnection, getMongoRepository } from 'typeorm';
import Attribute, { AttributeType } from '../models/Attribute';
import PrimaryProductDatum from '../models/PrimaryProductDatum';
import Product from '../models/Product';
import { error } from '../utils';
import { parse_product_datum_value_or_throw } from '../routers/product-router';
import { ProductDatumValue } from '../models/ProductDatum';

const data_json = JSON.parse(readFileSync(process.argv[2], 'utf-8'));
const rows = data_json.rows;
const predicates: string[] = data_json.predicates.filter((p: string) => p.match(/dbo:.+/));
const labels = data_json.labels;
const attributes_by_predicate: { [predicate: string]: Attribute } = {};

const resource_to_source = (resource: string) =>
    `http://dbpedia.org/resource/${resource.split(':')[1]}`;

const label_to_name = (label: string) =>
    label.replace(/@[a-z]+/, '');

error('Storing attributes');
const attributes = predicates
    .map((p) => {
        const messy = false;
        const name_transformed = p;
        const attr = new Attribute({
            name: name_transformed,
            subject: 'Cheese',
            interest: 0,
            messy,
            type: 'string',
        });
        attributes_by_predicate[p] = attr;
        return attr;
    });

(async () => {
    try {
        await createConnection();

        error('Deleting all attributes');
        await getMongoRepository(Attribute).deleteMany({ subject: 'Cheese' });

        error('Adding attributes');
        // console.debug(attributes);
        await Attribute.save(attributes);

        error('Deleting all products');
        await getMongoRepository(Product).deleteMany({ subject: 'Cheese' });

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
                subject: 'Cheese',
                name: r['rdfs:label'] ? label_to_name(r['rdfs:label']) : r.resource,
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
