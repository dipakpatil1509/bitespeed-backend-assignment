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
	if (contact_matched) {
		if (contact_matched.linkPrecedence === "primary") {
			contacts = await prisma.contact.findMany({
				where: {
					linkedId: contact_matched.id,
				},
			});
		} else {
			contacts = await prisma.contact.findMany({
				where: {
					OR: [
						{
							id: {
								equals: contact_matched.linkedId || -1,
								not: contact_matched.id,
							},
						},
						{
							linkedId: contact_matched.linkedId,
						},
					],
				},
			});
		}
		contacts = [contact_matched, ...contacts];

		const isEmailExist = contacts.some((a) => a.email === identifyBody.email);
		const isPhoneExist = contacts.some((a) => a.phoneNumber === identifyBody.phoneNumber);

		if (identifyBody.email && identifyBody.phoneNumber && !(isEmailExist && isPhoneExist)) {
			const alreadyExistInContacts = await prisma.contact.findMany({
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
				orderBy: [
					{
						linkPrecedence: "asc",
					},
					{
						createdAt: "asc",
					},
				],
			});

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
				secondary = secondary.map((a) => {
					a.linkedId = primary.id;
					a.linkPrecedence = "secondary";
					return a;
				});
				contacts.push(primary);
				contacts = contacts.concat(secondary);
			} else {
				const contact_created = await prisma.contact.create({
					data: {
						email: identifyBody.email,
						phoneNumber: identifyBody.phoneNumber,
						linkedId:
							contact_matched.linkPrecedence === "primary"
								? contact_matched.id
								: contact_matched.linkedId,
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
			emails: [], // first element being email of primary contact
			phoneNumbers: [], // first element being phoneNumber of primary contact
			secondaryContactIds: [], // Array of all Contact IDs that are "secondary" to the primary contact
		},
	};
	const emailSet = new Set<string>();
	const phoneNumberSet = new Set<string>();
	const secondaryContactIdSet = new Set<number>();
	contacts.map((contact) => {
		if (contact.email) {
			emailSet.add(contact.email);
		}
		if (contact.phoneNumber) {
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
