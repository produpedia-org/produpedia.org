import { ObjectID } from 'bson';
import express from 'express';
import { UNPROCESSABLE_ENTITY } from 'http-status-codes';
import Attribute from '../models/Attribute';
import Category from '../models/Category';
import { get_category_anchestors, get_category_by_name_case_insensitive } from './category-router';

const attribute_router = express.Router();

attribute_router.post('/', async (req, res) => {
    const { category, name, description, unit, type , label } = req.body;
    const attribute = new Attribute({
        category, // TODO verfify
        verified: false,
        interest: 0,
        name,
        label,
        description,
        unit,
        type,
    });
    await attribute.save();
    res.send(attribute);
});

attribute_router.get('/', async (req, res) => {
    const category = await get_category_by_name_case_insensitive(req.query.category as string);
    if(!category)
        return res.status(UNPROCESSABLE_ENTITY).send('Param category missing or not found');
    const attributes = await Attribute.find({
        category: { $in: [
            category.name,
            ...(await get_category_anchestors(category)).map(c => c.name),
        ]}
    });
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
