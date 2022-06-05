import { InMemoryCache } from '@apollo/client/cache';
import { ApolloClient } from '@apollo/client/core';
import { ApolloLink } from '@apollo/client/link/core';
import { HttpLink } from '@apollo/client/link/http';
import { authLink } from './auth';

const httpLink = new HttpLink({
  // uri: 'http://localhost:7071/graphql',
  uri: 'https://slicedb-api.herokuapp.com/graphql',
});

export const apolloClient = new ApolloClient({
  cache: new InMemoryCache(),
  link: ApolloLink.from([authLink, httpLink]),
});
