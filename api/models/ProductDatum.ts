import { IsNotIn, IsUrl } from 'class-validator';
import { BaseEntity, Column, Entity, ObjectID, ObjectIdColumn } from 'typeorm';
import { AttributeType } from './Attribute';

export type ProductDatumValue = AttributeType | AttributeType[] | null;

// todo prevent instantiation AND saving, only derived allowed
@Entity()
class ProductDatum extends BaseEntity {
    @ObjectIdColumn()
    public _id!: ObjectID;
    @Column()
    public user!: string; // objid or username? todo. + -> valid constraint
    @Column()
    @IsNotIn([undefined])
    public value!: ProductDatumValue;
    @Column()
    @IsUrl()
    public source!: string; // todo: collaborative array (maybe)

}

export default ProductDatum;
