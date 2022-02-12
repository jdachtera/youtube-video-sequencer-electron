import {
  ApolloClient,
  ApolloLink,
  HttpLink,
  InMemoryCache,
} from '@apollo/client';

import { authLink } from './auth';

const httpLink = new HttpLink({
  // uri: 'http://localhost:7071/graphql',
  uri: 'https://slicedb-api.herokuapp.com/graphql',
});

export const apolloClient = new ApolloClient({
  cache: new InMemoryCache(),
  link: ApolloLink.from([authLink, httpLink]),
});
