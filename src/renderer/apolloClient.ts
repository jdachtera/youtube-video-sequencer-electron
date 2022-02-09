import { setContext } from '@apollo/client/link/context';

import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client';
import { authStore } from './LoginModal';

const httpLink = new HttpLink({
  uri: 'http://localhost:7071/graphql',
});

const withToken = setContext(() => {
  const token = authStore.getAccessToken();

  if (!token) return {};

  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
});

export const apolloClient = new ApolloClient({
  cache: new InMemoryCache(),
  link: HttpLink.from([withToken, httpLink]),
});
