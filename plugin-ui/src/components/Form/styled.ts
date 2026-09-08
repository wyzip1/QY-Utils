import styled from "styled-components";

export const FormStyled = styled.div<{
  titleAlign: "center" | "left" | "right";
}>`
  padding: 10px 16px;
  box-sizing: border-box;

  & .form-title {
    line-height: 20px;
    font-weight: 600;
    text-align: ${(props) => props.titleAlign};
    font-size: 16px;
    margin-bottom: 15px;
  }

  & .footer-btns {
    display: flex;
    column-gap: 10px;
  }
`;
