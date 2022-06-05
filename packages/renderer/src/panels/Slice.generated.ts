import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
import type * as Types from '../../types/graphql.generated.types';

export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = {
  [K in keyof T]: T[K];
};
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & {
  [SubKey in K]?: Maybe<T[SubKey]>;
};
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & {
  [SubKey in K]: Maybe<T[SubKey]>;
};
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: string;
  String: string;
  Boolean: boolean;
  Int: number;
  Float: number;
};

/** Create new slice */
export type CreateSliceInput = {
  end: Scalars['Float'];
  playbackSpeed: Scalars['Float'];
  reverse: Scalars['Boolean'];
  sourceUrl: Scalars['String'];
  start: Scalars['Float'];
  tagNames: Array<Scalars['String']>;
  title: Scalars['String'];
};

export type Mutation = {
  __typename?: 'Mutation';
  addTagToSlice: Slice;
  createSlice: Slice;
  login: Scalars['String'];
  removeSlice: Scalars['String'];
  removeTagFromSlice: Slice;
  signup: Scalars['String'];
  updatePassword: Scalars['Boolean'];
  updateSliceTitle: Slice;
};

export type MutationAddTagToSliceArgs = {
  id: Scalars['String'];
  tag: Scalars['String'];
};

export type MutationCreateSliceArgs = {
  data: CreateSliceInput;
};

export type MutationLoginArgs = {
  password: Scalars['String'];
  usernameOrEmail: Scalars['String'];
};

export type MutationRemoveSliceArgs = {
  id: Scalars['String'];
};

export type MutationRemoveTagFromSliceArgs = {
  id: Scalars['String'];
  tag: Scalars['String'];
};

export type MutationSignupArgs = {
  email: Scalars['String'];
  password: Scalars['String'];
  username: Scalars['String'];
};

export type MutationUpdatePasswordArgs = {
  newPassword: Scalars['String'];
};

export type MutationUpdateSliceTitleArgs = {
  id: Scalars['String'];
  title: Scalars['String'];
};

export type PagedSliceList = {
  __typename?: 'PagedSliceList';
  items: Array<Slice>;
  itemsPerPage: Scalars['Int'];
  numberOfPages: Scalars['Int'];
  page: Scalars['Int'];
  totalNumberOfItems: Scalars['Int'];
};

export type PagedTagList = {
  __typename?: 'PagedTagList';
  items: Array<Tag>;
  itemsPerPage: Scalars['Int'];
  numberOfPages: Scalars['Int'];
  page: Scalars['Int'];
  totalNumberOfItems: Scalars['Int'];
};

export type PagedUserList = {
  __typename?: 'PagedUserList';
  items: Array<User>;
  itemsPerPage: Scalars['Int'];
  numberOfPages: Scalars['Int'];
  page: Scalars['Int'];
  totalNumberOfItems: Scalars['Int'];
};

export type Query = {
  __typename?: 'Query';
  slices: PagedSliceList;
  tags: PagedTagList;
  user: User;
  users: PagedUserList;
};

export type QuerySlicesArgs = {
  page?: InputMaybe<Scalars['Int']>;
  sourceUrl?: InputMaybe<Scalars['String']>;
  tags?: InputMaybe<Array<Scalars['String']>>;
};

export type QueryTagsArgs = {
  page?: InputMaybe<Scalars['Int']>;
};

export type QueryUsersArgs = {
  page?: InputMaybe<Scalars['Int']>;
};

export type Slice = {
  __typename?: 'Slice';
  creator: User;
  end: Scalars['Float'];
  id: Scalars['ID'];
  playbackSpeed: Scalars['Float'];
  reverse: Scalars['Boolean'];
  sourceUrl: Scalars['String'];
  start: Scalars['Float'];
  tags: Array<Tag>;
  title: Scalars['String'];
};

export type Tag = {
  __typename?: 'Tag';
  name: Scalars['ID'];
};

export type User = {
  __typename?: 'User';
  email: Scalars['String'];
  id: Scalars['ID'];
  role: Scalars['String'];
  slices: Array<Slice>;
  username: Scalars['String'];
};

export type SliceFragmentFragment = {
  __typename?: 'Slice';
  id: string;
  title: string;
  sourceUrl: string;
  start: number;
  end: number;
  playbackSpeed: number;
  reverse: boolean;
  creator: { __typename?: 'User'; id: string; username: string };
  tags: Array<{ __typename?: 'Tag'; name: string }>;
};

export type AddSliceMutationVariables = Types.Exact<{
  data: Types.CreateSliceInput;
}>;

export type AddSliceMutation = {
  __typename?: 'Mutation';
  createSlice: {
    __typename?: 'Slice';
    id: string;
    title: string;
    sourceUrl: string;
    start: number;
    end: number;
    playbackSpeed: number;
    reverse: boolean;
    creator: { __typename?: 'User'; id: string; username: string };
    tags: Array<{ __typename?: 'Tag'; name: string }>;
  };
};

export type SlicesQueryVariables = Types.Exact<{
  page: Types.Scalars['Int'];
  tagNames?: Types.InputMaybe<
    Array<Types.Scalars['String']> | Types.Scalars['String']
  >;
}>;

export type SlicesQuery = {
  __typename?: 'Query';
  slices: {
    __typename?: 'PagedSliceList';
    page: number;
    numberOfPages: number;
    totalNumberOfItems: number;
    itemsPerPage: number;
    items: Array<{
      __typename?: 'Slice';
      id: string;
      title: string;
      sourceUrl: string;
      start: number;
      end: number;
      playbackSpeed: number;
      reverse: boolean;
      creator: { __typename?: 'User'; id: string; username: string };
      tags: Array<{ __typename?: 'Tag'; name: string }>;
    }>;
  };
};

export type TagsQueryVariables = Types.Exact<{
  page: Types.Scalars['Int'];
}>;

export type TagsQuery = {
  __typename?: 'Query';
  tags: {
    __typename?: 'PagedTagList';
    page: number;
    numberOfPages: number;
    totalNumberOfItems: number;
    itemsPerPage: number;
    items: Array<{ __typename?: 'Tag'; name: string }>;
  };
};

export const SliceFragmentFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'SliceFragment' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'Slice' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'creator' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'username' } },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'title' } },
          { kind: 'Field', name: { kind: 'Name', value: 'sourceUrl' } },
          { kind: 'Field', name: { kind: 'Name', value: 'start' } },
          { kind: 'Field', name: { kind: 'Name', value: 'end' } },
          { kind: 'Field', name: { kind: 'Name', value: 'playbackSpeed' } },
          { kind: 'Field', name: { kind: 'Name', value: 'reverse' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'tags' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<SliceFragmentFragment, unknown>;
export const AddSliceDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'AddSlice' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'data' } },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'CreateSliceInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'createSlice' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'data' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'data' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'SliceFragment' },
                },
              ],
            },
          },
        ],
      },
    },
    ...SliceFragmentFragmentDoc.definitions,
  ],
} as unknown as DocumentNode<AddSliceMutation, AddSliceMutationVariables>;
export const SlicesDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'Slices' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'page' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'Int' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'tagNames' },
          },
          type: {
            kind: 'ListType',
            type: {
              kind: 'NonNullType',
              type: {
                kind: 'NamedType',
                name: { kind: 'Name', value: 'String' },
              },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'slices' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'page' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'page' },
                },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'tags' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'tagNames' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'page' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'numberOfPages' },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'totalNumberOfItems' },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'itemsPerPage' },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'items' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'FragmentSpread',
                        name: { kind: 'Name', value: 'SliceFragment' },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
    ...SliceFragmentFragmentDoc.definitions,
  ],
} as unknown as DocumentNode<SlicesQuery, SlicesQueryVariables>;
export const TagsDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'Tags' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'page' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'Int' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'tags' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'page' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'page' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'page' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'numberOfPages' },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'totalNumberOfItems' },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'itemsPerPage' },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'items' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<TagsQuery, TagsQueryVariables>;
