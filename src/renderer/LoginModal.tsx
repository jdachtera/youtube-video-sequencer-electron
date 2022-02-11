import { ApolloError, gql } from '@apollo/client';
import { createSignal, Show, Suspense } from 'solid-js';
import { createMutation, createQuery } from '@merged/solid-apollo';
import { authStore, useIsLoggedIn } from './auth';

export const LoginModal = () => {
  const isLoggedIn = useIsLoggedIn();

  return (
    <Suspense fallback={<>Loading...</>}>
      <Show when={isLoggedIn()} fallback={<LoginForm />}>
        <LoggedIn />
      </Show>
    </Suspense>
  );
};

const LoggedIn = () => {
  const handleLogout = () => authStore.removeAccessToken();

  const data = createQuery<{
    user: { id: StringConstructor; username: string };
  }>(gql`
    query User {
      user {
        id
        username
      }
    }
  `);

  return (
    <>
      You are logged in as {data()?.user.username}
      <button onClick={handleLogout}>Logout</button>
    </>
  );
};

const LoginForm = () => {
  const [error, setError] = createSignal<Error>();
  const [usernameOrEmail, setUsernameOrEmail] = createSignal('');
  const [password, setPassword] = createSignal('');
  const [mutate] = createMutation<
    { login: string },
    { usernameOrEmail: string; password: string }
  >(gql`
    mutation Login($usernameOrEmail: String!, $password: String!) {
      login(usernameOrEmail: $usernameOrEmail, password: $password)
    }
  `);

  const handleSubmit = async () => {
    try {
      const { login: accessToken } = await mutate({
        variables: {
          usernameOrEmail: usernameOrEmail(),
          password: password(),
        },
      });

      setError(undefined);

      if (accessToken) {
        authStore.setAccessToken(accessToken);
      }
    } catch (error) {
      if (error instanceof ApolloError) {
        setError(error);
      } else {
        setError(new Error('An unknown error occurred'));
      }
    }
  };

  return (
    <div>
      <Show when={error()}>
        <div>{error()?.message}</div>
      </Show>
      <label>
        Username / Email
        <input
          type="text"
          name="username"
          onChange={(event) => setUsernameOrEmail(event.currentTarget.value)}
        ></input>
      </label>
      <label>
        Password
        <input
          type="password"
          name="password"
          onChange={(event) => setPassword(event.currentTarget.value)}
        ></input>
      </label>
      <button type="submit" onClick={handleSubmit}>
        Login
      </button>
    </div>
  );
};
