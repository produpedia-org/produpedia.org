import { IsBoolean, IsIn, IsInt, IsNumber, IsOptional, Length, Max, Min } from 'class-validator';
import { BaseEntity, Column, Entity, ObjectID, ObjectIdColumn } from 'typeorm';

// todo ... ways to prevent the duplicate declarations here?
// TODO: fifth type? "resource". currently, resources are simply dbr: strings
export type AttributeType = string | number | boolean | Date;
export type AttributeTypeType = 'string' | 'number' | 'boolean' | 'date';
export const attributeTypeTypes: AttributeTypeType[] = ['string', 'number', 'boolean', 'date'];

@Entity()
class Attribute extends BaseEntity {
    @ObjectIdColumn()
    public _id!: ObjectID;
    @Column()
    @Length(3, 20)
    public subject!: string; // objectid?
    @Column()
    @IsBoolean()
    public verified: boolean = false;
    @Column()
    @IsInt()
    @Min(0)
    @Max(100)
    public interest: number = 0;
    @Column()
    @IsBoolean()
    public messy: boolean = false;
    @Column()
    @Length(1, 50)
    public name!: string;
    @Column()
    @IsOptional()
    @Length(0, 255)
    public description!: string;
    @Column()
    @IsOptional()
    @Length(1, 20)
    public unit!: string;
    @Column()
    @IsIn(attributeTypeTypes)
    public type!: AttributeTypeType;
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
    public float!: boolean;

    public constructor(init: Partial<Attribute>) {
        super();
        Object.assign(this, init);
    }
}

export default Attribute;
