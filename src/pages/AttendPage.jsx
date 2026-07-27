// ... داخل دالة المعالجة بعد التقاط الصورة
const handleSubmit = async (photo) => {
const submitCheckout = useCallback(async (photo) => {
    const locStr = await getAddressFromCoords(); // جلب الموقع
    
    const { data } = await axios.post(`${API}/auth/attendance/smart`, {
    const { data } = await axios.post(`${API}/auth/checkout`, {
      device_id: getDeviceId(),
      location: locStr,
      photo, // إرسال الصورة
      timestamp: new Date().toISOString()
    }, {
      headers: { Authorization: `Bearer ${userToken}` }
    });

    if existing_log or user.get("last_checkin_date") == today:
        # Already checked in — if not yet checked out, treat this scan as checkout
        if existing_log and not existing_log.get("checkout_time"):
            client_ip_co = request.headers.get("X-Forwarded-For", request.client.host if request.client else "غير معروف")
            co_result = await do_checkout(user, CheckoutInput(), client_ip_co)
            return {**co_result, "action": "checkout"}

    // الرد من السيرفر يجب أن يخبرنا هل كان هذا حضور أم انصراف
    if (data.type === 'checkout') {
      setStep('done');
      setSuccessMsg(`تم تسجيل الانصراف بنجاح. مدة العمل: ${data.work_hours}`);
    } else {
      setStep('done');
      setSuccessMsg('تم تسجيل الحضور بنجاح. يوم سعيد!');
    }
  } catch (error) {
    // معالجة الخطأ
  }
};
}, [token, userToken, getDeviceId, getAddressFromCoords, API]);