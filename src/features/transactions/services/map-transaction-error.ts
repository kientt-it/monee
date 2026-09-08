export function mapTransactionError(message: string) {
  if (message.includes("INVALID_TRANSFER_ACCOUNT")) return "Tài khoản nguồn và đích phải khác nhau.";
  if (message.includes("INVALID_ACCOUNT")) return "Tài khoản không hợp lệ.";
  if (message.includes("INVALID_CATEGORY")) return "Danh mục không hợp lệ.";
  if (message.includes("INVALID_AMOUNT")) return "Số tiền phải lớn hơn 0.";
  if (message.includes("TRANSACTION_NOT_FOUND")) return "Không tìm thấy giao dịch.";
  if (message.includes("TRANSACTION_DELETED")) return "Giao dịch này đã bị xóa.";
  return "Không thể cập nhật giao dịch lúc này.";
}
