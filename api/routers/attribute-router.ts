import { ObjectID } from 'bson';
import express from 'express';
import { UNPROCESSABLE_ENTITY, NOT_FOUND } from 'http-status-codes';
import Attribute from '../models/Attribute';
import Category from '../models/Category';
import Product from '../models/Product';
import { get_category_anchestors, get_category_by_name_case_insensitive } from './category-router';

const attribute_router = express.Router();

attribute_router.get('/', async (req, res) => {
    let attributes: Attribute[];
    if(req.query.category) {
        const category = await get_category_by_name_case_insensitive(req.query.category as string);
        if(!category)
            return res.status(UNPROCESSABLE_ENTITY).send('Param category missing or not found');
        attributes = await Attribute.find({
            category: { $in: [
                category.name,
                ...(await get_category_anchestors(category)).map(c => c.name),
            ]}
        });
    } else if(req.query.product) {
        const product = await Product.findOne({ name: req.query.product as string });
        if(!product)
            return res.status(NOT_FOUND).send(`Product with name "${req.query.product}" does not exist`);
        attributes = await Attribute.find({
            name: {
                $in: Object.keys(product.data),
            },
        });
    } else {
        return res.status(UNPROCESSABLE_ENTITY).send('You need to specify as query parameter either category or product');
    }
    return res.send(attributes);
});

attribute_router.get('/:name', async (req, res) => {
    if(!req.params.name)
        return res.status(UNPROCESSABLE_ENTITY).send('url param /attribute/NAME is missing');
    const attribute = await Attribute.findOne({
        name: req.params.name
    });
    if(!attribute)
        return res.status(NOT_FOUND).send(`attribute "${req.params.name}" not found!`);
    return res.send(attribute);
});

export default attribute_router;
