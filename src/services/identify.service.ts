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
	const or_condition_contact_matched: any[] = [];
	if (identifyBody.email) {
		or_condition_contact_matched.push({
			email: identifyBody.email,
		});
	}
	if (identifyBody.phoneNumber) {
		or_condition_contact_matched.push({
			phoneNumber: identifyBody.phoneNumber || "",
		});
	}
	const contact_matched = await prisma.contact.findFirst({
		where: {
			OR: or_condition_contact_matched,
		},
	});
	console.log(or_condition_contact_matched, contact_matched)
	let contacts: Contact[] = [];
	if (contact_matched) {
		let primary_id = -1;
		let secondary_linked_id = contact_matched.id;
		if (contact_matched.linkPrecedence !== "primary" && contact_matched.linkedId) {
			primary_id = contact_matched.linkedId;
			secondary_linked_id = contact_matched.linkedId;
		}

		contacts = await prisma.contact.findMany({
			where: {
				OR: [
					{
						id: {
							equals: primary_id,
							not: contact_matched.id,
						},
					},
					{
						linkedId: secondary_linked_id,
					},
				],
			},
		});
		contacts = [contact_matched, ...contacts];

		const isEmailExist = contacts.some((a) => a.email === identifyBody.email);
		const isPhoneExist = contacts.some((a) => a.phoneNumber === identifyBody.phoneNumber);
		if (identifyBody.email && identifyBody.phoneNumber && !(isEmailExist && isPhoneExist)) {
			console.log(isEmailExist, isPhoneExist, !(isEmailExist && isPhoneExist));
			const or_condition: any[] = [];
			if (!isEmailExist) {
				or_condition.push({
					email: identifyBody.email,
				});
			}
			if (!isPhoneExist) {
				or_condition.push({
					phoneNumber: identifyBody.phoneNumber || "",
				});
			}
			const alreadyExistInContacts = await prisma.contact.findMany({
				where: {
					OR: or_condition,
				},
				orderBy: [
					{
						linkPrecedence: "asc",
					},
					{
						createdAt: "asc",
					},
				],
			});

			console.log(alreadyExistInContacts);

			if (alreadyExistInContacts.length > 0) {
				let [primary, ...secondary] = alreadyExistInContacts;
				if (primary.linkPrecedence !== "primary" && primary.linkedId) {
					const primary_parent = await prisma.contact.findFirst({
						where: {
							id: primary.linkedId,
						},
					});
					if (primary_parent) {
						secondary.push(primary);
						primary = primary_parent;
					}
				}
				await prisma.contact.updateMany({
					where: {
						id: {
							in: secondary.map((a) => a.id),
						},
					},
					data: {
						linkedId: primary.id,
						linkPrecedence: "secondary",
					},
				});
				secondary.map((a) => {
					a.linkedId = primary.id;
					a.linkPrecedence = "secondary";
				});
				contacts.push(primary);
				contacts = contacts.concat(secondary);
			} else {
				const contact_created = await prisma.contact.create({
					data: {
						email: identifyBody.email,
						phoneNumber: identifyBody.phoneNumber,
						linkedId: secondary_linked_id,
						linkPrecedence: "secondary",
					},
				});
				contacts.push(contact_created);
			}
		}
	} else {
		//Create new primary Contact
		const contact_created = await prisma.contact.create({
			data: {
				email: identifyBody.email,
				phoneNumber: identifyBody.phoneNumber,
				linkPrecedence: "primary",
			},
		});
		contacts = [contact_created];
	}

	contacts.sort(
		(a: Contact, b: Contact) =>
			a.linkPrecedence.localeCompare(b.linkPrecedence) &&
			a.createdAt.getTime() - b.createdAt.getTime()
	);

	const data: identifyResponse = {
		contact: {
			primaryContatctId: -1,
			emails: [],
			phoneNumbers: [],
			secondaryContactIds: [],
		},
	};
	const emailSet = new Set<string>();
	const phoneNumberSet = new Set<string>();
	const secondaryContactIdSet = new Set<number>();
	contacts.map((contact) => {
		if (contact.email && contact.email !== "null") {
			emailSet.add(contact.email);
		}
		if (contact.phoneNumber && contact.phoneNumber !== "null") {
			phoneNumberSet.add(contact.phoneNumber);
		}
		if (contact.linkPrecedence === "secondary") {
			secondaryContactIdSet.add(contact.id);
		} else {
			data.contact.primaryContatctId = contact.id;
		}
	});
	data.contact.emails = Array.from(emailSet);
	data.contact.phoneNumbers = Array.from(phoneNumberSet);
	data.contact.secondaryContactIds = Array.from(secondaryContactIdSet);

	return sendResponse({
		data: data,
	});
};

export default {
	identify,
};
