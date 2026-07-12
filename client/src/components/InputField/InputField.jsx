import "./InputField.css";

function InputField({

    icon,

    type,

    placeholder

}){

    return(

        <div className="input-field">

            <div className="input-icon">

                {icon}

            </div>

            <input

                type={type}

                placeholder={placeholder}

            />

        </div>

    );

}

export default InputField;