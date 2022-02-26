import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';

import { ApolloLink } from '@apollo/client/link/core';

import { TypedEmitter } from 'tiny-typed-emitter';
import { createSignalFromEventEmitter } from './engine/EngineBase';

const withToken = setContext(() => {
  const token = authStore.getAccessToken();

  if (!token) return {};

  return { headers: { Authorization: `Bearer ${token}` } };
});

const handleAuthError = onError((error) => {
  error.graphQLErrors?.forEach((error) => {
    const statusCode = (error.extensions?.exception as { statusCode?: number })
      ?.statusCode;

    if (statusCode === 401) {
      authStore.removeAccessToken();
    }
  });
});

class AuthStore extends TypedEmitter<{
  change: (accessToken?: string) => void;
}> {
  getAccessToken() {
    return localStorage.getItem('accessToken');
  }

  setAccessToken(accessToken: string) {
    localStorage.setItem('accessToken', accessToken);
    this.emit('change', accessToken);
  }

  removeAccessToken() {
    localStorage.removeItem('accessToken');
    this.emit('change');
  }
}

export const authStore = new AuthStore();
authStore.setMaxListeners(Infinity);

export const useIsLoggedIn = () =>
  createSignalFromEventEmitter(
    authStore,
    (authStore) => !!authStore.getAccessToken(),
    'change'
  );

export const authLink = ApolloLink.from([withToken, handleAuthError]);
