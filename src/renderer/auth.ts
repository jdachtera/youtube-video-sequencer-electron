import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';

import { ApolloLink } from '@apollo/client';
import EventEmitter from 'events';
import { createSignal, onCleanup, onMount } from 'solid-js';

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

class AuthStore extends EventEmitter {
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

export const useIsLoggedIn = () => {
  const [isLoggedIn, setIsLoggedIn] = createSignal(false);

  const handleAuthTokenChanged = () => {
    setIsLoggedIn(!!authStore.getAccessToken());
  };

  handleAuthTokenChanged();
  onMount(() => authStore.on('change', handleAuthTokenChanged));
  onCleanup(() => authStore.off('change', handleAuthTokenChanged));

  return isLoggedIn;
};

export const authStore = new AuthStore();
export const authLink = ApolloLink.from([withToken, handleAuthError]);
