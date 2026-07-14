import "./PrimaryButton.css";

// components/PrimaryButton/PrimaryButton.jsx
function PrimaryButton({ text, onClick, type = "button" }) {
    return (
        <button 
            className="primary-button" 
            onClick={onClick}
            type={type}
        >
            {text}
        </button>
    );
}

export default PrimaryButton;