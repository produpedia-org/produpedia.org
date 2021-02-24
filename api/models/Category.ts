import { IsBoolean, Length, IsOptional, IsObject, IsUrl, IsArray, IsNumber } from 'class-validator';
import { BaseEntity, Column, Entity, ObjectIdColumn } from 'typeorm';
import { ObjectID } from 'mongodb';

/* TODO: index:
db.category.createIndex({ 'label': 'text', 'aliases': 'text' }, { default_language: 'english', language_override: 'nonexisting_field_9894279872' })
*/

@Entity()
class Category extends BaseEntity {
    @ObjectIdColumn()
    @IsOptional()
    public _id!: ObjectID;
    @Column()
    @Length(1, 255)
    public name!: string;
    @Column()
    @IsArray()
    @IsOptional()
    @Length(1, 255, { each: true })
    public alternative_names?: string[];
    @Column()
    @Length(1, 100)
    public label!: string;
    @Column()
    @IsBoolean()
    @IsOptional()
    public wrapper?: boolean;
    @Column()
    @IsBoolean()
    @IsOptional()
    public ontology_only?: boolean;
    @Column()
    @IsArray()
    @Length(1, 255, { each: true })
    public parents!: string[];
    @Column()
    @IsOptional()
    @IsArray()
    @Length(1, 100, { each: true })
    public aliases?: string[];
    @Column()
    @IsOptional()
    @IsArray()
    @Length(1, 255, { each: true })
    public showers?: string[];
    @Column()
    @IsNumber()
    @IsOptional()
    /** not necessarily accurate, but after dbp import, only for visualization */
    public products_count!: number;

    public constructor(init: Partial<Category>) {
        super();
        Object.assign(this, init);
    }

}

export default Category;
