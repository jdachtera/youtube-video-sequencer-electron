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

export type UserQueryVariables = Types.Exact<{ [key: string]: never }>;

export type UserQuery = {
  __typename?: 'Query';
  user: {
    __typename?: 'User';
    id: string;
    username: string;
    email: string;
    role: string;
  };
};

export type LoginMutationVariables = Types.Exact<{
  usernameOrEmail: Types.Scalars['String'];
  password: Types.Scalars['String'];
}>;

export type LoginMutation = { __typename?: 'Mutation'; login: string };

export type SignupMutationVariables = Types.Exact<{
  email: Types.Scalars['String'];
  username: Types.Scalars['String'];
  password: Types.Scalars['String'];
}>;

export type SignupMutation = { __typename?: 'Mutation'; signup: string };

export const UserDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'User' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'user' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'username' } },
                { kind: 'Field', name: { kind: 'Name', value: 'email' } },
                { kind: 'Field', name: { kind: 'Name', value: 'role' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<UserQuery, UserQueryVariables>;
export const LoginDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'Login' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'usernameOrEmail' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'String' },
            },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'password' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'String' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'login' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'usernameOrEmail' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'usernameOrEmail' },
                },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'password' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'password' },
                },
              },
            ],
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<LoginMutation, LoginMutationVariables>;
export const SignupDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'Signup' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'email' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'String' },
            },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'username' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'String' },
            },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'password' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'String' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'signup' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'email' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'email' },
                },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'username' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'username' },
                },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'password' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'password' },
                },
              },
            ],
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<SignupMutation, SignupMutationVariables>;
