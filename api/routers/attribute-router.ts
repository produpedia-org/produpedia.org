import { ObjectID } from 'bson';
import express from 'express';
import Attribute from '../models/Attribute';

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
    const category = req.query.t as string;
    const attributes = await Attribute.find({
        category,
    });
    res.send(attributes);
});

export default attribute_router;
