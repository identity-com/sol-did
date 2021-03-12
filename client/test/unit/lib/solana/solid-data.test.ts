import {
  ClusterType,
  ServiceEndpoint,
  SolidData,
} from '../../../../src/lib/solana/solid-data';
import { Account } from '@solana/web3.js';
import { omit } from 'ramda';
import { makeService } from '../../../util';

const pub = () => new Account().publicKey;

describe('solid-data', () => {
  describe('merge', () => {
    describe('with default behaviour', () => {
      it('should merge a sparse solidData object into an empty one', () => {
        const empty = SolidData.empty();
        const sparse = SolidData.sparse(
          pub(),
          pub(),
          ClusterType.mainnetBeta()
        );

        const merged = empty.merge(sparse);

        expect(merged).toEqual(sparse);
      });

      it('should not change a sparse solidData object when merging an empty one into it, except for the identifier', () => {
        const empty = SolidData.empty();
        const sparse = SolidData.sparse(
          pub(),
          pub(),
          ClusterType.mainnetBeta()
        );

        const merged = sparse.merge(empty);

        expect(omit(['did'], merged)).toEqual(omit(['did'], sparse));
      });

      it('should allow properties to be added to empty arrays', () => {
        const withService = SolidData.empty();
        withService.service = [
          ServiceEndpoint.parse(makeService(new Account())),
        ];
        const sparse = SolidData.sparse(
          pub(),
          pub(),
          ClusterType.mainnetBeta()
        );

        const merged = sparse.merge(withService);

        expect(merged.service).toEqual(withService.service);
      });

      it('should allow properties to be added to existing arrays', () => {
        const sparseWithService = SolidData.sparse(
          pub(),
          pub(),
          ClusterType.mainnetBeta()
        );
        sparseWithService.service = [
          ServiceEndpoint.parse(makeService(new Account())),
        ];

        const justService = new SolidData({
          service: [ServiceEndpoint.parse(makeService(new Account()))],
        });

        const merged = sparseWithService.merge(justService);

        expect(merged.service).toEqual([
          ...sparseWithService.service,
          ...justService.service,
        ]);
      });
    });

    describe('with overwriteArrays=true', () => {
      it('should merge a sparse solidData object into an empty one', () => {
        const empty = SolidData.empty();
        const sparse = SolidData.sparse(
          pub(),
          pub(),
          ClusterType.mainnetBeta()
        );

        const merged = empty.merge(sparse, true);

        expect(merged).toEqual(sparse);
      });

      it('should clear the contents of a solidData object when merging an empty one', () => {
        const empty = SolidData.empty();
        const sparse = SolidData.sparse(
          pub(),
          pub(),
          ClusterType.mainnetBeta()
        );

        const merged = sparse.merge(empty, true);

        expect(merged).toEqual(empty);
      });

      it('should allow properties to be replaced', () => {
        const sparseWithService = SolidData.sparse(
          pub(),
          pub(),
          ClusterType.mainnetBeta()
        );
        sparseWithService.service = [
          ServiceEndpoint.parse(makeService(new Account())),
        ];

        const justService = new SolidData({
          service: [ServiceEndpoint.parse(makeService(new Account()))],
        });

        const merged = sparseWithService.merge(justService, true);

        expect(merged.service).toEqual(justService.service);
      });
    });
  });
});
