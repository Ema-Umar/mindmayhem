import "./Login.css";

import Logo from "../../components/Logo/Logo";
import InputField from "../../components/InputField/InputField";
import PrimaryButton from "../../components/PrimaryButton/PrimaryButton";

import { FaEnvelope, FaLock } from "react-icons/fa";

function Login() {

    return (

        <div className="login-page">

            <div className="background-circle circle1"></div>
            <div className="background-circle circle2"></div>

            <div className="login-card">

                {/* LEFT SIDE */}

                <div className="login-left">

                    <div className="paint paint1"></div>
                    <div className="paint paint2"></div>

                    <img
                        src="/login-illustration.png"
                        alt="Login"
                        className="login-image"
                    />

                </div>

                {/* RIGHT SIDE */}

                <div className="login-right">

                    <Logo />

                    <InputField
                        icon={<FaEnvelope />}
                        type="email"
                        placeholder="Email Address"
                    />

                    <InputField
                        icon={<FaLock />}
                        type="password"
                        placeholder="Password"
                    />

                    <div className="forgot-password">

                        Forgot Password?

                    </div>

                    <PrimaryButton
                        text="LOGIN"
                    />

                    <div className="register-link">

                        Don't have an account?

                        <span>

                            Register

                        </span>

                    </div>

                </div>

            </div>

        </div>

    );

}

export default Login;