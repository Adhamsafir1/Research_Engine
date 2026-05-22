import streamlit as st
import requests
import os
from streamlit_webrtc import webrtc_streamer, WebRtcMode
import json

# Backend URL
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")

st.set_page_config(page_title="AskLumen Research AI", page_icon="🧬", layout="wide")

st.title("AskLumen Research AI")
st.subheader("Multimodal Research Engine")

# File Uploaders
st.sidebar.title("Upload Documents / Images")
uploaded_pdf = st.sidebar.file_uploader("Upload Academic PDF", type=["pdf"])
uploaded_image = st.sidebar.file_uploader("Upload Image for Vision", type=["png", "jpg", "jpeg"])

if uploaded_pdf:
    st.sidebar.success(f"Uploaded {uploaded_pdf.name}")
    # Integration with backend Document Parser would happen here

# Voice Interface
st.markdown("### Voice Search")
st.write("Click below to start a real-time voice session.")
webrtc_streamer(
    key="voice-search",
    mode=WebRtcMode.SENDRECV,
    rtc_configuration={"iceServers": [{"urls": ["stun:stun.l.google.com:19302"]}]},
    media_stream_constraints={"video": False, "audio": True},
    # In a full implementation, you'd define an AudioProcessor track here
)

# Text Interface
topic = st.text_input("Research Topic", placeholder="Enter your research query...")
if st.button("Generate Intelligence"):
    if topic:
        with st.spinner("Agents working..."):
            try:
                response = requests.post(f"{BACKEND_URL}/api/v1/research", json={"topic": topic})
                if response.status_code == 200:
                    data = response.json()
                    st.success("Research completed.")
                    
                    tab1, tab2, tab3 = st.tabs(["Final Report", "Critic Feedback", "Logs"])
                    with tab1:
                        report_content = data.get("report", "")
                        st.download_button(
                            label="Download Report as Markdown",
                            data=report_content,
                            file_name=f"{topic.replace(' ', '_').lower()}_report.md",
                            mime="text/markdown"
                        )
                        st.markdown(report_content, unsafe_allow_html=True)
                    with tab2:
                        st.markdown(data.get("feedback", ""))
                    with tab3:
                        st.json(data.get("logs", []))
                else:
                    st.error(f"Error: {response.text}")
            except Exception as e:
                st.error(f"Failed to connect to backend: {e}")
    else:
        st.warning("Please enter a topic.")
