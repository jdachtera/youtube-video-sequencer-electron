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
