import { IsBoolean, IsIn, IsInt, IsNumber, IsOptional, Length, Max, Min, IsString } from 'class-validator';
import { BaseEntity, Column, Entity, ObjectIdColumn } from 'typeorm';
import { ObjectID } from 'mongodb';

// todo ... ways to prevent the duplicate declarations here?
// TODO: fifth type? "resource". currently, resources are simply dbr: strings
export type AttributeType = string | number | boolean | Date;
export type AttributeTypeType = 'resource' | 'string' | 'number' | 'boolean' | 'date';
export const attributeTypeTypes: AttributeTypeType[] = ['resource', 'string', 'number', 'boolean', 'date'];

/* TODO: index:
db.attribute.createIndex({ 'label': 'text' }, { default_language: 'english' })
*/

@Entity()
class Attribute extends BaseEntity {
    @ObjectIdColumn()
    @IsOptional()
    public _id!: ObjectID;
    @Column()
    @Length(3, 50)
    public category!: string;
    @Column()
    @IsBoolean()
    public verified: boolean = false;
    @Column()
    @IsInt()
    @Min(0)
    public interest: number = 0;
    @Column()
    @Length(1, 50)
    public name!: string;
    @Column()
    @Length(1, 100)
    public label!: string;
    @Column()
    @IsOptional()
    @Length(0, 2000)
    public description!: string;
    @Column()
    @IsOptional()
    @Length(1, 40)
    public unit!: string;
    @Column()
    @IsIn(attributeTypeTypes)
    public type!: AttributeTypeType;
    @Column()
    @IsOptional()
    @IsString()
    public range?: string;
    @Column()
    @IsOptional()
    @IsNumber()
    // fixme: validation: int if not this.float
    public min!: number;
    @Column()
    @IsOptional()
    @IsNumber()
    // fixme: validation: int if not this.float
    public max!: number;
    @Column()
    @IsOptional()
    @IsBoolean()
    // fixme only allow if type == number
    // todo rely on type instead, rm this
    public float!: boolean;
    @Column()
    @IsOptional()
    @IsString()
    public source?: string;

    public constructor(init: Partial<Attribute>) {
        super();
        Object.assign(this, init);
    }
}

export default Attribute;
