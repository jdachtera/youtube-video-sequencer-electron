import { ApolloError } from '@apollo/client';
import { createEffect, createSignal, Show, Suspense } from 'solid-js';
import { createMutation, createQuery } from '@merged/solid-apollo';
import { authStore, useIsLoggedIn } from './auth';
import { LoginDocument, UserDocument } from './User.generated';

export const LoginModal = () => {
  const isLoggedIn = useIsLoggedIn();

  return (
    <Suspense fallback={'Loading...'}>
      <Show when={isLoggedIn()} fallback={<LoginForm />}>
        <LoggedIn />
      </Show>
    </Suspense>
  );
};

const LoggedIn = () => {
  const handleLogout = () => authStore.removeAccessToken();
  const data = createQuery(UserDocument);

  createEffect(() => console.log({ data: data() }));

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
  const [mutate] = createMutation(LoginDocument);

  const handleSubmit = async () => {
    try {
      const { login: accessToken } = await mutate({
        variables: {
          usernameOrEmail: usernameOrEmail(),
          password: password(),
        },
      });

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
