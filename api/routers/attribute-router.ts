import { ObjectID } from 'bson';
import express from 'express';
import { UNPROCESSABLE_ENTITY } from 'http-status-codes';
import Attribute from '../models/Attribute';
import Category from '../models/Category';
import { get_category_anchestors } from './category-router';

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
    const category = await Category.findOne({ name: req.query.category as string });
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

export default attribute_router;
