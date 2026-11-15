import { GoogleLogin } from '@react-oauth/google';

export default function GoogleSignInButton({
  onSuccess,
  onError,
  text = 'signup_with',
}) {
  return (
    <div className="google-sign-in-button">
      <GoogleLogin
        onSuccess={onSuccess}
        onError={onError}
        text={text}
        size="large"
        theme="outline"
        shape="rectangular"
      />
    </div>
  );
}