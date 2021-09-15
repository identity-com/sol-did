import {
  ClusterType,
  ServiceEndpoint,
  SolData,
} from '../../../../src/lib/solana/sol-data';
import { Keypair } from '@solana/web3.js';
import { omit } from 'ramda';
import { makeService } from '../../../util';

const pub = () => Keypair.generate().publicKey;

const withoutAuthority = (solData: Partial<SolData>) =>
  omit(['authority', 'account', 'cluster', 'version'], solData);

describe('sol-data', () => {
  describe('merge', () => {
    describe('with default behaviour', () => {
      it('should not change a sparse solData object when merging an empty one into it', async () => {
        const empty = await SolData.empty();
        const sparse = SolData.sparse(pub(), pub(), ClusterType.mainnetBeta());

        const merged = sparse.merge(empty);

        expect(merged).toMatchObject(sparse);
      });

      it('should not change a sparse solData object when merging an empty one with no authority', async () => {
        const empty = (await SolData.empty()) as Partial<SolData>;
        delete empty.authority;
        const sparse = SolData.sparse(pub(), pub(), ClusterType.mainnetBeta());

        const merged = sparse.merge(empty);

        expect(merged).toMatchObject(sparse);
      });

      it('should allow properties to be added to empty arrays', async () => {
        const withService = await SolData.empty();
        withService.service = [
          await ServiceEndpoint.parse(await makeService(Keypair.generate())),
        ];
        const sparse = SolData.sparse(pub(), pub(), ClusterType.mainnetBeta());

        const merged = sparse.merge(withService);

        expect(merged.service).toEqual(withService.service);
      });

      it('should allow properties to be added to existing arrays', async () => {
        const sparseWithService = SolData.sparse(
          pub(),
          pub(),
          ClusterType.mainnetBeta()
        );
        sparseWithService.service = [
          await ServiceEndpoint.parse(await makeService(Keypair.generate())),
        ];

        const justService = new SolData({
          service: [
            await ServiceEndpoint.parse(await makeService(Keypair.generate())),
          ],
        });

        const merged = sparseWithService.merge(justService);

        expect(merged.service).toEqual([
          ...sparseWithService.service,
          ...justService.service,
        ]);
      });
    });

    describe('with overwriteArrays=true', () => {
      it('should clear the contents of a solData object when merging an empty one', async () => {
        const empty = await SolData.empty();
        const sparse = SolData.sparse(pub(), pub(), ClusterType.mainnetBeta());

        const merged = sparse.merge(empty, true);

        expect(withoutAuthority(merged)).toMatchObject(withoutAuthority(empty));
      });

      it('should allow properties to be replaced', async () => {
        const sparseWithService = SolData.sparse(
          pub(),
          pub(),
          ClusterType.mainnetBeta()
        );
        sparseWithService.service = [
          await ServiceEndpoint.parse(await makeService(Keypair.generate())),
        ];

        const justService = new SolData({
          service: [
            await ServiceEndpoint.parse(await makeService(Keypair.generate())),
          ],
        });

        const merged = sparseWithService.merge(justService, true);

        expect(merged.service).toEqual(justService.service);
      });
    });
  });
});
