import express from 'express';
import Category from '../models/Category';

const category_router = express.Router();

category_router.get('/', async (req, res) => {
    const categories = await Category.find();
    res.send(categories);
});

export default category_router;
