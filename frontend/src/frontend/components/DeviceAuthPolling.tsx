import { useState, useCallback, useEffect } from "react";
import styles from "./DeviceAuthPolling.module.scss";

type DeviceAuthPollingProps = {
	userCode: string;
	verificationUrl: string;
	expiresIn: number;
};

const DeviceAuthPolling = ({
	userCode,
	verificationUrl,
	expiresIn,
}: DeviceAuthPollingProps) => {
	const [copied, setCopied] = useState(false);
	const [remainingTime, setRemainingTime] = useState(expiresIn);

	const handleCopy = useCallback(() => {
		navigator.clipboard.writeText(userCode).then(() => {
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		});
	}, [userCode]);

	useEffect(() => {
		const timer = setInterval(() => {
			setRemainingTime((prev) => prev - 1);
		}, 1000);
		return () => clearInterval(timer);
	}, []);

	return (
		<div className={styles.container}>
			<h2 className={styles.title}>Sign in to MeTube</h2>
			<p className={styles.instructions}>
				To sign in, please do the following on another device:
			</p>
			<ol className={styles.steps}>
				<li>
					Go to{" "}
					<a
						href={verificationUrl}
						target="_blank"
						rel="noreferrer"
						className={styles.link}
					>
						{verificationUrl}
					</a>
				</li>
				<li>Enter the following code:</li>
			</ol>
			<div className={styles.codeContainer}>
				<code className={styles.code}>{userCode}</code>
				<button
					className={styles.copyBtn}
					onClick={handleCopy}
					aria-label="Copy code"
				>
					{copied ? "✓" : "📋"}
				</button>
			</div>
			<p className={styles.timer}>Expires in {formatTime(remainingTime)}</p>
		</div>
	);
};

const formatTime = (seconds: number): string => {
	const mins = Math.floor(seconds / 60);
	const secs = seconds % 60;
	return `${mins}:${secs.toString().padStart(2, "0")}`;
};

export default DeviceAuthPolling;