export type APIResponse = {
	success?: boolean;
	message?: string;
	data?: {
		[key: string | number | symbol]: any;
	};
	customCode?: number;
	errorObject?: any;
};
export const sendResponse = ({
	success = true,
	message = "Successfully got it",
	data = {},
	customCode = 0,
	errorObject = {},
}: APIResponse) => {
	console.log(errorObject);
	return {
		success,
		message,
		data,
		customCode,
	};
};
