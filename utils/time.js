export const convertToIST = (date) => {
  if (!date) return null;

  return new Date(date).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour12: true
  });
};

export const formatStudentToIST = (student) => {

  return {
    ...student._doc,

    createdAt: convertToIST(student.createdAt),
    updatedAt: convertToIST(student.updatedAt),

    follow_up_date: convertToIST(student.follow_up_date),

    history: student.history?.map(h => ({
      ...h._doc,
      updated_at: convertToIST(h.updated_at),
      follow_up_date: convertToIST(h.follow_up_date)
    })),

    payments: student.payments?.map(p => ({
      ...p._doc,
      payment_date: convertToIST(p.payment_date)
    }))
  };
};