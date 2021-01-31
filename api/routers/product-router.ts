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
import { get_category_anchestors, get_category_children, get_category_by_name_case_insensitive } from './category-router';

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

product_router.post('/product', async (req, res) => {
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

product_router.delete('/product/:name', admin_secured, async (req, res) => {
    res.send(await Product.delete({
        name: req.params.name,
    }));
});

/** Propose a ProductDatum */
product_router.post('/product/:product_name/data/:attribute_name', async (req, res) => {
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
    direction: 1|-1;
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
product_router.get('/list/:category', async (req, res) => {
    /*********** parse  *********/
    const category = await get_category_by_name_case_insensitive(req.params.category as string);
    if(!category)
        return res.status(UNPROCESSABLE_ENTITY).send('Param category missing or not found');
    let limit: number|undefined = Number(req.query.limit);
    if (limit < 0)
        limit = undefined;
    if (Number.isNaN(limit))
        limit = 25;
    const offset = Number(req.query.offset);
    const showers_param = req.query.attributes as string;
    let columns_count = 0;
    let shower_names: string[] = [];
    if(showers_param) {
        if(!Number.isNaN(Number(showers_param))) {
            columns_count = Number(showers_param);
        } else {
            shower_names = showers_param.split(',').filter(Boolean);
        }
    }
    const sorters_param: string = req.query.sort as string || '';
    // @ts-ignore
    const sorters: Sorter[] = sorters_param
        .split(',').filter(Boolean)
        .map((s: string): Sorter|null => {
            const split = s.split(':');
            const direction = Number(split[1]);
            if(direction!==1 && direction !==-1)
                return null;
            return {
                attribute_name: split[0],
                direction,
            };
        });
    if(sorters.some(sorter => ! sorter)) {
        return res.status(UNPROCESSABLE_ENTITY).send('Sorter param invalid: Sort order needs to be 1 or -1');
    }
    const sorters_formatted: FindOptionsOrder<Product> = sorters
        .reduce((all: object, sorter) => ({
            ...all,
            [`data.${sorter.attribute_name}.value`]: sorter.direction,
        }), {});
    const filter_param: string = req.query.filter as string || '';
    const filters: Filter[] = (await Promise.all(
        filter_param
            .split(',').filter(Boolean)
            .map(async (s: string): Promise<Filter | null> => {
                const [attribute_name, condition, value, case_str] = s.split(':');
                const case_sensitive = case_str !== 'i';
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
        case 'lt':
            return { $lt: parse_value_or_throw(filter.value, filter.attribute) };
        case 'le':
            return { $lte: parse_value_or_throw(filter.value, filter.attribute) };
        case 'gt':
            return { $gt: parse_value_or_throw(filter.value, filter.attribute) };
        case 'ge':
            return { $gte: parse_value_or_throw(filter.value, filter.attribute) };
        case 'null':
            return { $exists: false };
        case 'not_null':
            return { $exists: true };
        case 'contains':
            return new RegExp(regexp_escape(String(filter.value)), filter.case_sensitive ? undefined : 'i');
        case 'not_contains':
            return { $not: new RegExp(regexp_escape(String(filter.value)), filter.case_sensitive ? undefined : 'i') };
        case 'begins_with':
            return new RegExp("^"+regexp_escape(String(filter.value)), filter.case_sensitive ? undefined : 'i');
        case 'ne':
            return { $ne: parse_value_or_throw(filter.value, filter.attribute) };
        case 'eq':
            if (filter.attribute.type !== 'string' || filter.case_sensitive)
                return parse_value_or_throw(filter.value, filter.attribute);
            return new RegExp(`^${regexp_escape(String(filter.value))}$`, 'i');
        default:
            throw `Filter condition "${filter.condition}" not recognized`;
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

    /** The specified category plus all of its recursive parents */
    // TODO rm djplicates
    const category_anchestor_names = [
        category.name,
        ...(await get_category_anchestors(category)).map(c => c.name),
    ];
    /** The specified category plus all of its recursive children */
    const category_family_names = [
        category.name,
        ...(await get_category_children(category)).map(c => c.name),
    ];


    /*********** determine showers if not given **********/
    if (!shower_names.length) {
        const category_anchestor_attributes = await Attribute.find({
            select: ['name', 'category'],
            where: {
                category: { $in: category_anchestor_names },
            },
            order: {
                interest: 'DESC',
            },
        });
        const category_anchestor_attribute_names = category_anchestor_attributes
            .map(attribute => attribute.name)
        // Use category showers by default: Ordered by value usage count of products
        // in this very category
        shower_names = (category.showers||[])
            .filter(attribute_name => category_anchestor_attribute_names.includes(attribute_name))
            .slice(0, columns_count)
        const missing_columns_count = columns_count - shower_names.length;
        if(missing_columns_count > 0) {
            // Category showers werent enough, need to fill up with other columns of this category/parents,
            // which however have no values, sorted 1. by category: The target category's attributes first,
            // then the parents' ones, then parents' parents' and so on, and sorted 2. by interest, that is,
            // by value usage count accross *all* categories
            shower_names.push(...category_anchestor_attributes
                .filter(attribute => ! shower_names.includes(attribute.name))
                .sort((a,b) => category_anchestor_names.indexOf(a.category) - category_anchestor_names.indexOf(b.category))
                .slice(0, missing_columns_count)
                .map(attribute => attribute.name))
            // Could still be not enough columns but there are no more applicable for this category
        }
        shower_names.unshift('thumbnail', 'label');
    }

    /************ compute *************/
    const shower_names_formatted = shower_names.map(name => `data.${name}`) as (keyof Product)[];

    /********** Search ***********/
    let products: Product[];
    let failure = null;
    // TODO: Maybe add a cache table (SQL) that is faster than querying the
    // nested structure
    try {
        products = await Product.find({
            where: {
                $and: [
                    { categories: { $in: category_family_names } },
                    ...filters_formatted,
                ],
            } as any,
            select: [
                'name', 'verified',
                ...shower_names_formatted,
            ],
            order: {
                // Numbers inside text attributes will be sorted lexically, not by their value
                // This can (and should) be solved by changing these categories to type number
                ...sorters_formatted,
            },
            take: limit,
            skip: offset,
        });
    } catch(e) {
        if(e.message === 'Executor error during find command :: caused by :: cannot sort with keys that are parallel arrays') {
            products = [];
            failure = 'parallel_arrays';
        } else {
            throw e;
        }
    }

    // todo fix this with typeorm (idk)
    products.forEach((p: Product) => {
        if (!p.data) {
            p.data = {};
        }
        // doesnt seem to be doable by class decorator yet, see typeorm#3781
        delete p._id;
    });

    /********** return **********/
    return res.send({
        products,
        shower_names, // maybe as seperate request?
        failure,
    });
});

product_router.get('/product/:name', async (req, res) => {
    if(!req.params.name)
        return res.status(UNPROCESSABLE_ENTITY).send('url param /product/NAME is missing');
    const product = await Product.findOne({
        name: req.params.name
    });
    if(!product)
        return res.status(NOT_FOUND).send(`Product "${req.params.name}" not found!`);
    return res.send(product);
});

export default product_router;
