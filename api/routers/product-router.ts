import dayjs from 'dayjs';
import express from 'express';
import { NOT_FOUND, UNPROCESSABLE_ENTITY } from 'http-status-codes';
import { ObjectID } from 'mongodb';
import { FindOptionsOrder } from 'typeorm';
import admin_secured from '../admin-secured';
import Attribute, { AttributeType } from '../models/Attribute';
import PrimaryProductDatum from '../models/PrimaryProductDatum';
import Product from '../models/Product';
import { ProductDatumValue } from '../models/ProductDatum';
import ProductDatumProposal from '../models/ProductDatumProposal';
import { regexp_escape } from '../utils';

// tslint:disable no-string-throw
/**
 * Transforms @param raw into a proper AttributeType value (date string into
 * Date object, Number parse and so on), depending on @param attribute's
 * properties, and throws a string with an error message if the raw input doesnt
 * make sense or has the wrong format
 */
function parse_single_value_or_throw(raw_single: string, attribute: Attribute): AttributeType {
    let value: AttributeType;
    if (attribute.type === 'string') {
        if (typeof raw_single !== 'string') { // && raw_single !== null) {
            throw `Wrong type: Expected 'string', got '${typeof raw_single}'!`; //  or 'null'
        }
        if (!raw_single.length) {
            throw 'Missing value!';
        }
        value = raw_single;
    } else if (attribute.type === 'boolean') {
        if ([null, 'off', false, 'false', 'no', 0].includes(raw_single)) {
            value = false;
        } else if (['on', true, 'true', 'yes', 1].includes(raw_single)) {
            value = true;
        } else {
            throw `Value '${raw_single}' cannot be parsed as a boolean!`;
        }
    } else if (attribute.type === 'number') {
        if (attribute.float) {
            value = Number.parseFloat(raw_single);
        } else {
            value = Number.parseInt(raw_single); // tslint:disable-line radix - Generously accept dec and 0xhex
        }
        if (Number.isNaN(value)) {
            throw `Value '${raw_single}' cannot be parsed as a number!`;
        }
        if (attribute.min != null && value < attribute.min || attribute.max != null && value > attribute.max) {
            throw `Value '${value}' is outside the allowed boundaries: min: ${attribute.min}, max: ${attribute.max}.`;
        }
    } else if (attribute.type === 'date') {
        const date = dayjs(raw_single);
        if (!date.isValid())
            throw `Value '${raw_single}' is not a valid date!`;
        value = date.toDate();
    } else {
        throw 'Attribute is misconfigured: Type missing!';
    }
    return value;
}

/**
 * Transforms @param raw into a proper ProductDatumValue value, which means
 * returning `parse_single_value_or_throw()` as an array or a single value.
 */
export function parse_product_datum_value_or_throw(raw: any, attribute: Attribute): ProductDatumValue {
    if (typeof raw === 'string') {
        const splits = raw.split(';');
        if (splits.length > 1) {
            return splits.map(s => parse_single_value_or_throw(s, attribute));
        }
    }
    return parse_single_value_or_throw(raw, attribute);
}

const product_router = express.Router();

product_router.post('/', async (req, res) => {
    const { name, subject } = req.body;
    const product = new Product({
        name,
        subject,
        verified: false,
        data: {},
    });
    await product.save();
    res.send(product);
});

product_router.delete('/:id', admin_secured, async (req, res) => {
    res.send(await Product.delete({
        _id: new ObjectID(req.params._id),
    }));
});

/** Propose a ProductDatum */
product_router.post('/:product_id/data/:attribute_id', async (req, res) => {
    const { product_id, attribute_id } = req.params;
    const { value: input_value, source } = req.body;
    const attribute = await Attribute.findOne({ _id: new ObjectID(attribute_id) });
    if (!attribute) {
        return res.status(NOT_FOUND).send('Attribute not found');
    }
    const product_obj_id = new ObjectID(product_id);
    const product = await Product.findOne({
        where: { _id: product_obj_id },
        // select: [ `data.${attribute_id}` ] // todo
    });
    if (!product) {
        return res.status(NOT_FOUND).send('Product not found');
    }

    // value validation //////
    let value: ProductDatumValue;
    try {
        value = parse_product_datum_value_or_throw(input_value, attribute);
    } catch (error_msg) {
        return res.status(UNPROCESSABLE_ENTITY).send(error_msg);
    }
    const datum = {
        value,
        source,
        user: res.locals.user && res.locals.user._id.toHexString() || undefined,
    };
    const datum_proposal = new ProductDatumProposal({
        ...datum,
        attribute: attribute._id.toHexString(),
        product: product._id.toHexString(),
    });
    const primary_datum = new PrimaryProductDatum({
        ...datum,
    });

    await datum_proposal.save();

    // todo same as below
    if (!product.data) {
        product.data = {};
    }
    if (!product.data[attribute_id]) {
        product.data[attribute_id] = primary_datum;
        await product.save();
        // todo which one?  what if product select todo is active?
        /*await Product.update({
            _id: product_obj_id,
        }, {
            [`data.${attribute_id}`]: primary_datum,
        });*/
    }
    return res.send(datum_proposal);
});

interface Sorter {
    attribute_id: string;
    direction: number;
}
interface Filter {
    attribute: Attribute;
    condition: string;
    condition_value: string;
    case_sensitive: boolean;
}
type MongoFilter = {[key: string]: any};

// todo types missing everywhere
// todo probably should be using graphql
// todo add checks for code 422 etc
product_router.get('/', async (req, res) => {
    /*********** parse  *********/
    const subject: string = req.query.t;
    let shower_ids: string[] = req.query.sh
        .split(',').filter(Boolean);
    const sorters_param: string = req.query.so;
    const sorters: Sorter[] = sorters_param
        .split(',').filter(Boolean)
        .map((s: string): Sorter => {
            const split = s.split(':');
            return {
                attribute_id: split[0],
                direction: Number(split[1]),
            };
        });
    const sorters_formatted: FindOptionsOrder<Product> = sorters
        .reduce((all: object, sorter) => ({
            ...all,
            [`data.${sorter.attribute_id}.value`]: sorter.direction,
        }),     {});
    const filter_param: string = req.query.f;
    const filters: Filter[] = (await Promise.all(
        filter_param
            .split(',').filter(Boolean)
            .map(async (s: string): Promise<Filter | null> => {
                const [attribute_id, condition, condition_value, case_str] = s.split(':');
                const case_sensitive = !case_str || case_str !== 'i';
                // TODO: is this cached or same request for same attribute multiple times?
                const attribute = await Attribute.findOne({
                    _id: new ObjectID(attribute_id),
                });
                if (!attribute)
                    return null;
                return {
                    attribute, condition, condition_value, case_sensitive,
                };
            })))
        .filter(Boolean) as Filter[];
    let filters_formatted: MongoFilter[];
    try {
        filters_formatted = filters
            .map((filter) => {
                let filter_condition_formatted;
                switch (filter.condition) {
                case 'lt':
                    filter_condition_formatted = {
                        $lt: parse_single_value_or_throw(filter.condition_value, filter.attribute),
                    }; break;
                case 'gt':
                    filter_condition_formatted = {
                        $gt: parse_single_value_or_throw(filter.condition_value, filter.attribute),
                    }; break;
                case 'nu':
                    filter_condition_formatted = {
                        $exists: false,
                    }; break;
                case 'nn':
                    filter_condition_formatted = {
                        $exists: true,
                    }; break;
                case 'con':
                    filter_condition_formatted =
                        new RegExp(regexp_escape(String(filter.condition_value)), filter.case_sensitive ? undefined : 'i');
                    break;
                case 'ne':
                    filter_condition_formatted = {
                        $ne: parse_single_value_or_throw(filter.condition_value, filter.attribute),
                    }; break;
                case 'eq':
                default:
                    if (filter.attribute.type !== 'string' || filter.case_sensitive) {
                        filter_condition_formatted =
                            parse_single_value_or_throw(filter.condition_value, filter.attribute);
                    } else {
                        filter_condition_formatted =
                            new RegExp(`^${regexp_escape(String(filter.condition_value))}$`, 'i');
                    }
                    break;
                }
                return { [`data.${filter.attribute._id.toHexString()}.value`]: filter_condition_formatted };
            });
    } catch (error_msg) {
        return res.status(UNPROCESSABLE_ENTITY).send(error_msg);
    }
    // Add NOT NULL filter for all those attributes that are being sorted by
    // ASC order. This is necessary because MongoDB does not have any such feature
    // as "NULLS LAST".
    filters_formatted.push(...sorters
        .filter(sorter => sorter.direction === 1)
        .map(sorter => ({ [`data.${sorter.attribute_id}.value`]: { $exists: true } })));

    /*********** determine showers if not given **********/
    if (!shower_ids.length) {
        const count: number = Number(req.query.c);
        shower_ids = (await Attribute.find({
            select: ['_id'],
            where: {
                subject,
            },
            take: count,
            order: {
                interest: 'DESC',
            },
        }))
        .map((attribute: Attribute) => attribute._id.toString());
    }

    /************ compute *************/
    const shower_ids_formatted = shower_ids.map(id => `data.${id}`) as (keyof Product)[];

    /********** Search ***********/
    // TODO: Maybe add a cache table (SQL) that is faster than querying the
    // nested structure
    const products = await Product.find({
        where: {
            $and: [
                { subject },
                ...filters_formatted,
            ],
        } as any,
        select: [
            '_id', 'name', 'verified', // todo select doesnt work at all (?) https://github.com/typeorm/typeorm/pull/3756 edit only if no default values in class/constructor (?)
            ...shower_ids_formatted,
        ],
        order: {
            ...sorters_formatted,
        },
        take: 30, // FIXME
    });

    // todo fix this with typeorm (idk)
    products.forEach((p: Product) => {
        if (!p.data) {
            p.data = {};
        }
    });

    /********** return **********/
    return res.send({
        products,
        shower_ids, // maybe as seperate request?
    });
});

export default product_router;
