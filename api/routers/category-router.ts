import express from 'express';
import Category from '../models/Category';
import { NOT_FOUND } from 'http-status-codes';
import { FindOptions } from 'typeorm';
import Product from '../models/Product';

const category_router = express.Router();

export const get_category_by_name_case_insensitive = async (category_name: string) => {
    return await Category.findOne({
        name: new RegExp(`^${category_name}$`, 'i')
    } as FindOptions<Category>);
};

export const get_category_anchestors = async (target_category: Category) => {
    const anchestors: Category[] = [];
    const add_anchestors = async (category: Category) => {
        for(const parent_name of category.parents) {
            const parent = await Category.findOneOrFail({ name: parent_name });
            anchestors.push(parent);
            await add_anchestors(parent);
        }
    };
    await add_anchestors(target_category);
    return anchestors;
}
export const get_category_children = async (target_category: Category) => {
    const family: Category[] = [];
    const add_children = async (category: Category) => {
        const children = await Category.find({
            parents: category.name
        });
        for(const child of children) {
            family.push(child);
            await add_children(child);
        }
    };
    await add_children(target_category);
    return family;
}

category_router.get('/', async (req, res) => {
    let categories: Category[];
    const breadcrumbs_category_name = req.query.breadcrumbs as string;
    const product_name = req.query.product as string;
    if (breadcrumbs_category_name) {
        const breadcrumbs_category = await get_category_by_name_case_insensitive(breadcrumbs_category_name);
        if (!breadcrumbs_category)
            return res.status(NOT_FOUND).send(`Category with name "${breadcrumbs_category_name}" not found`);
        let i: Category = breadcrumbs_category;
        categories = [i];
        while (i.parents?.length) {
            const parent = await Category.findOneOrFail({ name: i.parents[0] });
            categories.unshift(parent);
            i = parent;
        }
    } else if(product_name) {
        const product = await Product.findOne({ name: product_name });
        if(!product)
            return res.status(NOT_FOUND).send(`Product with name "${req.query.product}" not found`);
        categories = await Category.find({
            name: {
                $in: product.categories,
            },
        });
    } else {
        categories = await Category.find();
    }
    categories.forEach(c => {
        delete c.showers;
        // @ts-ignore
        delete c._id;
    });
    return res.send(categories);
});

export default category_router;
