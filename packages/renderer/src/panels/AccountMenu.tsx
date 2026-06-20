import { ApolloError } from '@apollo/client/errors';
import { css } from '@emotion/css';
import { createMutation, createQuery, useApollo } from '@merged/solid-apollo';
import { createSignal, Show, Suspense } from 'solid-js';
import { ButtonWithLabel } from '../UI/ButtonWithLabel';
import { authStore, useIsLoggedIn } from '../auth';
import { LoginDocument, UserDocument } from './User.generated';

const dropdown = css`
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 4px;
  width: 200px;
  z-index: 1100;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px;
  background: #2a2a2a;
  border: 1px solid #111;
  border-radius: 4px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.5);
  color: #ddd;
  font-size: 12px;

  label {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  input {
    padding: 4px;
  }
`;

/**
 * Compact account control for the toolbar. Sharing slices to the SliceDB needs
 * an account, but most users never do — so login lives behind a small "Sign in"
 * button/dropdown instead of a strip across the top of the app.
 */
export const AccountMenu = () => {
  const isLoggedIn = useIsLoggedIn();
  const [open, setOpen] = createSignal(false);

  return (
    <div
      class={css`
        position: relative;
        align-self: center;
      `}
    >
      <ButtonWithLabel
        labelOnButton={true}
        activated={open()}
        onClick={() => setOpen((value) => !value)}
        label={isLoggedIn() ? 'Account' : 'Sign in'}
      />
      <Show when={open()}>
        <div class={dropdown}>
          <Suspense fallback={'Loading…'}>
            <Show
              when={isLoggedIn()}
              fallback={<LoginForm onDone={() => setOpen(false)} />}
            >
              <LoggedIn onDone={() => setOpen(false)} />
            </Show>
          </Suspense>
        </div>
      </Show>
    </div>
  );
};

const LoggedIn = (props: { onDone: () => void }) => {
  const apolloClient = useApollo();
  const data = createQuery(UserDocument);

  const handleLogout = () => {
    authStore.removeAccessToken();
    apolloClient.clearStore();
    props.onDone();
  };

  return (
    <>
      <div>Signed in as {data()?.user.username}</div>
      <button type="button" onClick={handleLogout}>
        Log out
      </button>
    </>
  );
};

const LoginForm = (props: { onDone: () => void }) => {
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
        props.onDone();
      }
    } catch (error) {
      setError(
        error instanceof ApolloError
          ? error
          : new Error('An unknown error occurred'),
      );
    }
  };

  return (
    <>
      <Show when={error()}>
        <div
          class={css`
            color: #e88;
          `}
        >
          {error()?.message}
        </div>
      </Show>
      <label>
        Username / Email
        <input
          type="text"
          name="username"
          onInput={(event) => setUsernameOrEmail(event.currentTarget.value)}
        />
      </label>
      <label>
        Password
        <input
          type="password"
          name="password"
          onInput={(event) => setPassword(event.currentTarget.value)}
        />
      </label>
      <button type="button" onClick={handleSubmit}>
        Sign in
      </button>
    </>
  );
};
