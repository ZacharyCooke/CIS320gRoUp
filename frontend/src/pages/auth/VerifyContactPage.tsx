import { useState } from "react";

export function VerifyContactPage() {
  const [code, setCode] = useState("");

  return (
    <section className="form-page">
      <h1>Verify your contact information</h1>
      <form>
        <label>
          6-digit code
          <input
            value={code}
            onChange={(event) => setCode(event.target.value)}
            inputMode="numeric"
            maxLength={6}
          />
        </label>
        <button type="submit">Verify & Continue</button>
      </form>
    </section>
  );
}
