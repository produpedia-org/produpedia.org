import { IsString } from 'class-validator';
import { Column, Entity } from 'typeorm';
import ProductDatum from './ProductDatum';

/**
 * verified === false
 * uniq(user, product, attribute)
 * C R ~U~ D
 */
@Entity()
class ProductDatumProposal extends ProductDatum {
    @Column()
    @IsString()
    public attribute!: string;
    @Column()
    @IsString()
    public product!: string;

    // votes
    // comments

    public constructor(init: Partial<ProductDatumProposal>) {
        super();
        Object.assign(this, init);
    }

}

export default ProductDatumProposal;
