import { IsBoolean, Length, IsOptional, IsObject, IsUrl, IsArray } from 'class-validator';
import { BaseEntity, Column, Entity, ObjectIdColumn } from 'typeorm';
import { ObjectID } from 'mongodb';

@Entity()
class Category extends BaseEntity {
    @ObjectIdColumn()
    @IsOptional()
    public _id!: ObjectID;
    @Column()
    @Length(1, 255)
    public name!: string;
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

    public constructor(init: Partial<Category>) {
        super();
        Object.assign(this, init);
    }

}

export default Category;
