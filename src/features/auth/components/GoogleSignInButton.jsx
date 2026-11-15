import { GoogleLogin } from '@react-oauth/google';

export default function GoogleSignInButton({ onSuccess, onError }) {
  return (
    <div className="google-sign-in-button">
      <GoogleLogin
        onSuccess={onSuccess}
        onError={onError}
        text="signup_with"
        size="large"
        theme="outline"
        shape="rectangular"
      />
    </div>
  );
}