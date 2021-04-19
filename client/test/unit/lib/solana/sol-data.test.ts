import {
  ClusterType,
  ServiceEndpoint,
  SolData,
} from '../../../../src/lib/solana/sol-data';
import { Account } from '@solana/web3.js';
import { omit } from 'ramda';
import { makeService } from '../../../util';

const pub = () => new Account().publicKey;

const withoutAuthority = (solData: SolData) => omit(['authority'], solData);

describe('sol-data', () => {
  describe('merge', () => {
    describe('with default behaviour', () => {
      it('should merge a sparse solData object into an empty one, except the authority', () => {
        const empty = SolData.empty();
        const sparse = SolData.sparse(pub(), pub(), ClusterType.mainnetBeta());

        const merged = empty.merge(sparse);

        expect(withoutAuthority(merged)).toEqual(withoutAuthority(sparse));
      });

      it('should not change a sparse solData object when merging an empty one into it', () => {
        const empty = SolData.empty();
        const sparse = SolData.sparse(pub(), pub(), ClusterType.mainnetBeta());

        const merged = sparse.merge(empty);

        expect(merged).toMatchObject(sparse);
      });

      it('should not change a sparse solData object when merging an empty one with no authority', () => {
        const empty = SolData.empty() as Partial<SolData>;
        delete empty.authority;
        const sparse = SolData.sparse(pub(), pub(), ClusterType.mainnetBeta());

        const merged = sparse.merge(empty);

        expect(merged).toMatchObject(sparse);
      });

      it('should allow properties to be added to empty arrays', async () => {
        const withService = SolData.empty();
        withService.service = [
          ServiceEndpoint.parse(await makeService(new Account())),
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
          ServiceEndpoint.parse(await makeService(new Account())),
        ];

        const justService = new SolData({
          service: [ServiceEndpoint.parse(await makeService(new Account()))],
        });

        const merged = sparseWithService.merge(justService);

        expect(merged.service).toEqual([
          ...sparseWithService.service,
          ...justService.service,
        ]);
      });
    });

    describe('with overwriteArrays=true', () => {
      it('should merge a sparse solData object into an empty one', () => {
        const empty = SolData.empty();
        const sparse = SolData.sparse(pub(), pub(), ClusterType.mainnetBeta());

        const merged = empty.merge(sparse, true);

        expect(withoutAuthority(merged)).toEqual(withoutAuthority(sparse));
      });

      it('should clear the contents of a solData object when merging an empty one', () => {
        const empty = SolData.empty();
        const sparse = SolData.sparse(pub(), pub(), ClusterType.mainnetBeta());

        const merged = sparse.merge(empty, true);

        expect(withoutAuthority(merged)).toMatchObject({
          ...withoutAuthority(empty),
          account: sparse.account, // empty SolData objects have no account
        });
      });

      it('should allow properties to be replaced', async () => {
        const sparseWithService = SolData.sparse(
          pub(),
          pub(),
          ClusterType.mainnetBeta()
        );
        sparseWithService.service = [
          ServiceEndpoint.parse(await makeService(new Account())),
        ];

        const justService = new SolData({
          service: [ServiceEndpoint.parse(await makeService(new Account()))],
        });

        const merged = sparseWithService.merge(justService, true);

        expect(merged.service).toEqual(justService.service);
      });
    });
  });
});
