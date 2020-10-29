import express from 'express';
import Category from '../models/Category';
import { NOT_FOUND } from 'http-status-codes';

const category_router = express.Router();

category_router.get('/', async (req, res) => {
    let categories: Category[];
    const breadcrumbs_category_name = req.query.breadcrumbs as string;
    if (breadcrumbs_category_name) {
        const breadcrumbs_category = await Category.findOne({ name: breadcrumbs_category_name });
        if (!breadcrumbs_category)
            return res.status(NOT_FOUND).send('Category not found');
        let i: Category = breadcrumbs_category;
        categories = [i];
        while (i.parents?.length) {
            const parent = await Category.findOneOrFail({ name: i.parents[0] });
            categories.unshift(parent);
            i = parent;
        }
    } else {
        categories = await Category.find();
    }
    return res.send(categories);
});

export default category_router;
