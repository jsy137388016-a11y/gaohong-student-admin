"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { dateValue, optionalNumber, textValue } from "@/lib/forms";
import { prisma } from "@/lib/prisma";

export async function createCommunication(formData: FormData) {
  await requireUser();
  const studentId = optionalNumber(formData, "studentId");
  if (!studentId) throw new Error("studentId is required");
  await prisma.communication.create({
    data: {
      studentId,
      target: textValue(formData, "target")!,
      method: textValue(formData, "method") as "phone" | "wechat" | "onsite" | "message" | "other",
      content: textValue(formData, "content")!,
      parentFeedback: textValue(formData, "parentFeedback", false),
      followUp: textValue(formData, "followUp", false),
      communicator: textValue(formData, "communicator")!,
      contactedAt: dateValue(formData, "contactedAt"),
      remark: textValue(formData, "remark", false)
    }
  });
  revalidatePath("/communications");
  revalidatePath("/dashboard");
}

export async function deleteCommunication(id: number) {
  await requireUser();
  await prisma.communication.delete({ where: { id } });
  revalidatePath("/communications");
  revalidatePath("/dashboard");
}
