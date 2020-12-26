import dayjs from 'dayjs';
import express from 'express';
import { NOT_FOUND, UNPROCESSABLE_ENTITY } from 'http-status-codes';
import { ObjectID } from 'mongodb';
import { FindOptionsOrder } from 'typeorm';
import admin_secured from '../admin-secured';
import Attribute, { AttributeType } from '../models/Attribute';
import Category from '../models/Category';
import PrimaryProductDatum from '../models/PrimaryProductDatum';
import Product from '../models/Product';
import { ProductDatumValue } from '../models/ProductDatum';
import ProductDatumProposal from '../models/ProductDatumProposal';
import { regexp_escape } from '../utils';
import { get_category_anchestors } from './category-router';

// tslint:disable no-string-throw
/**
 * Transforms @param raw into a proper AttributeType value (date string into
 * Date object, Number parse and so on), depending on @param attribute's
 * properties, and throws a string with an error message if the raw input doesnt
 * make sense or has the wrong format
 */
function parse_value_or_throw(raw_single: string, attribute: Attribute): AttributeType {
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

const product_router = express.Router();

product_router.post('/', async (req, res) => {
    const { name, label, source, categories } = req.body;
    const categories_arr = categories.split(',');
    const product = new Product({
        name,
        categories: categories_arr,
        verified: false,
        data: {
            label: new PrimaryProductDatum({
                value: label,
                user: 'unknown', // TODO
            }),
        },
        source,
    });
    await product.save();
    res.send(product);
});

product_router.delete('/:name', admin_secured, async (req, res) => {
    res.send(await Product.delete({
        name: req.params.name,
    }));
});

/** Propose a ProductDatum */
product_router.post('/:product_name/data/:attribute_name', async (req, res) => {
    const { product_name, attribute_name } = req.params;
    const { value: input_value, source } = req.body;
    const attribute = await Attribute.findOne({ name: attribute_name });
    if (!attribute) {
        return res.status(NOT_FOUND).send('Attribute not found');
    }
    const product = await Product.findOne({
        where: { name: product_name },
        // select: [ `data.${attribute_id}` ] // todo
    });
    if (!product) {
        return res.status(NOT_FOUND).send('Product not found');
    }

    // value validation //////
    let value: ProductDatumValue;
    try {
        value = parse_value_or_throw(input_value, attribute);
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
        attribute: attribute.name,
        product: product.name,
    });
    const primary_datum = new PrimaryProductDatum({
        ...datum,
    });

    await datum_proposal.save();

    // todo same as below
    if (!product.data) {
        product.data = {};
    }
    if (!product.data[attribute_name]) {
        product.data[attribute_name] = primary_datum;
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
    attribute_name: string;
    direction: number;
}
interface Filter {
    attribute: Attribute;
    condition: string;
    value: string;
    case_sensitive: boolean;
}
type MongoFilter = {[key: string]: any};

// todo types missing everywhere
// todo probably should be using graphql
// todo add checks for code 422 etc
product_router.get('/', async (req, res) => {
    /*********** parse  *********/
    const category = await Category.findOne({ name: req.query.category as string });
    if(!category)
        return res.status(UNPROCESSABLE_ENTITY).send('Param category missing or not found');
    let limit: number|undefined = Number(req.query.limit);
    if (limit < 0)
        limit = undefined;
    if (Number.isNaN(limit))
        limit = 25;
    const offset = Number(req.query.offset);
    const showers_param = req.query.show as string;
    let columns_count = 0;
    let shower_names: string[] = [];
    if(!Number.isNaN(Number(showers_param))) {
        columns_count = Number(showers_param);
    } else {
        shower_names = showers_param.split(',').filter(Boolean);
    }
    const sorters_param: string = req.query.sort as string;
    const sorters: Sorter[] = sorters_param
        .split(',').filter(Boolean)
        .map((s: string): Sorter => {
            const split = s.split(':');
            return {
                attribute_name: split[0],
                direction: Number(split[1]),
            };
        });
    const sorters_formatted: FindOptionsOrder<Product> = sorters
        .reduce((all: object, sorter) => ({
            ...all,
            [`data.${sorter.attribute_name}.value`]: sorter.direction,
        }), {});
    const filter_param: string = req.query.filter as string;
    const filters: Filter[] = (await Promise.all(
        filter_param
            .split(',').filter(Boolean)
            .map(async (s: string): Promise<Filter | null> => {
                const [attribute_name, condition, value, case_str] = s.split(':');
                const case_sensitive = !case_str || case_str !== 'i';
                // TODO: is this cached or same request for same attribute multiple times?
                const attribute = await Attribute.findOne({
                    name: attribute_name,
                });
                if (!attribute)
                    return null;
                return {
                    attribute, condition, value, case_sensitive,
                };
            })))
        .filter((f): f is Filter => !!f);
    const filter_to_formatted_filter_condition = (filter: Filter) => {
        switch (filter.condition) {
        case 'lt': case 'lessthan':
            return { $lt: parse_value_or_throw(filter.value, filter.attribute) };
        case 'gt': case 'greaterthan':
            return { $gt: parse_value_or_throw(filter.value, filter.attribute) };
        case 'nu': case 'null': case 'nexists': case 'notexists': case 'notexist': case 'nexist':
            return { $exists: false };
        case 'nn': case 'notnull': case 'exists': case 'exist':
            return { $exists: true };
        case 'con': case 'contains': case 'contain': case 'include': case 'includes':
            return new RegExp(regexp_escape(String(filter.value)), filter.case_sensitive ? undefined : 'i');
        case 'ne': case 'notequal': case 'notequals': case 'isnot': case 'not':
            return { $ne: parse_value_or_throw(filter.value, filter.attribute) };
        case 'eq': case 'equal': case 'equals': case 'is': default:
            if (filter.attribute.type !== 'string' || filter.case_sensitive)
                return parse_value_or_throw(filter.value, filter.attribute);
            return new RegExp(`^${regexp_escape(String(filter.value))}$`, 'i');
        }
    };
    let filters_formatted: MongoFilter[];
    try {
        filters_formatted = filters
            .map(filter => ({
                [`data.${filter.attribute.name}.value`]:
                    filter_to_formatted_filter_condition(filter),
            }));
    } catch (error_msg) {
        return res.status(UNPROCESSABLE_ENTITY).send(error_msg);
    }
    // Add NOT NULL filter for all those attributes that are being sorted by
    // ASC order. This is necessary because MongoDB does not have any such feature
    // as "NULLS LAST".
    filters_formatted.push(...sorters
        .filter(sorter => sorter.direction === 1)
        .map(sorter => ({ [`data.${sorter.attribute_name}.value`]: { $exists: true } })));

    /*********** determine showers if not given **********/
    if (!shower_names.length) {
        const category_names = [
            category.name,
            ...(await get_category_anchestors(category)).map(c => c.name),
        ];
        const shower_attributes = await Attribute.find({
            select: ['name', 'category'],
            where: {
                category: { $in: category_names },
            },
            take: columns_count,
            order: {
                interest: 'DESC',
            },
        });
        // Primarily sort by category: The target category's attributes first,
        // then the parents' ones, then parents' parents' and so on.
        // ^ TODO should interest be even more important?
        // This could also be done as part of the query via aggregation
        shower_attributes.sort((a, b) =>
            category_names.indexOf(a.category) - category_names.indexOf(b.category));
        shower_names = shower_attributes
            .map((attribute: Attribute) => attribute.name);

        shower_names.unshift('thumbnail', 'label');
    }

    /************ compute *************/
    const shower_names_formatted = shower_names.map(name => `data.${name}`) as (keyof Product)[];

    /********** Search ***********/
    // TODO: Maybe add a cache table (SQL) that is faster than querying the
    // nested structure
    const products = await Product.find({
        where: {
            $and: [
                { categories: category.name },
                ...filters_formatted,
            ],
        } as any,
        select: [
            'name', 'verified', 'categories', 'aliases', 'source',
            ...shower_names_formatted,
        ],
        order: {
            ...sorters_formatted,
        },
        take: limit,
        skip: offset,
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
        shower_names, // maybe as seperate request?
    });
});

export default product_router;
