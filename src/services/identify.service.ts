import { Contact } from "@prisma/client";
import prisma from "../../prisma";
import { APIResponse, sendResponse } from "../utils/helper";

export type identifyBody = {
	email?: string;
	phoneNumber?: number | string;
};

type identifyResponse = {
	contact: {
		primaryContatctId: number;
		emails: string[]; // first element being email of primary contact
		phoneNumbers: string[]; // first element being phoneNumber of primary contact
		secondaryContactIds: number[]; // Array of all Contact IDs that are "secondary" to the primary contact
	};
};

const identify = async (identifyBody: identifyBody): Promise<APIResponse> => {
	if (!identifyBody.email && !identifyBody.phoneNumber) {
		throw new Error("At least email or phone number is required");
	}
	identifyBody.phoneNumber = identifyBody.phoneNumber + "";
	const contact_matched = await prisma.contact.findFirst({
		where: {
			OR: [
				{
					email: identifyBody.email,
				},
				{
					phoneNumber: identifyBody.phoneNumber || "",
				},
			],
		},
	});
	let contacts: Contact[] = [];
	console.log("++++++++++++++++++++++-----------------------+", contact_matched);
	if (contact_matched) {
		if (contact_matched.linkPrecedence === "primary") {
			contacts = await prisma.contact.findMany({
				where: {
					linkedId: contact_matched.id,
				},
			});
		} else {
			console.log("+++++++++++++++++++++++", contact_matched);
			contacts = await prisma.contact.findMany({
				where: {
					OR: [
						{
							id: contact_matched.linkedId || -1,
						},
						{
							linkedId: contact_matched.linkedId,
						},
					],
				},
			});
		}
	} else {
		//Create new primary Contact
	}

	console.log(contacts);
	if (contact_matched) {
		contacts = [contact_matched, ...contacts];
	}

	contacts.sort((a: Contact, b: Contact) => a.createdAt.getTime() - b.createdAt.getTime());

	const data: identifyResponse = {
		contact: {
			primaryContatctId: -1,
			emails: [], // first element being email of primary contact
			phoneNumbers: [], // first element being phoneNumber of primary contact
			secondaryContactIds: [], // Array of all Contact IDs that are "secondary" to the primary contact
		},
	};
	data.contact.primaryContatctId = contacts[0]?.id;
	contacts.map((contact, id) => {
		if (contact.email) {
			data.contact.emails.push(contact.email);
		}
		if (contact.phoneNumber) {
			data.contact.phoneNumbers.push(contact.phoneNumber);
		}
		if (id !== 0) {
			data.contact.secondaryContactIds.push(contact.id);
		}
	});
	data.contact.phoneNumbers = Array.from(new Set(data.contact.phoneNumbers));
	data.contact.emails = Array.from(new Set(data.contact.emails));
	data.contact.secondaryContactIds = Array.from(new Set(data.contact.secondaryContactIds));

	return sendResponse({
		data: data,
	});
};

export default {
	identify,
};
