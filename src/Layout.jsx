import React from 'react';
import styled, { css, ThemeProvider } from 'styled-components';
import { grid, th } from '@pubsweet/ui-toolkit';
import { ComponentPlugin } from 'wax-prosemirror-core';
import theme from './theme';


const fontWriting = css`
  color: ${th('colorText')};
  font-family: ${th('fontWriting')};
  font-size: ${th('fontSizeBase')};
`;

const EditorElements = css`
  .ProseMirror {
    ${fontWriting}
  }
`;

const Wrapper = styled.div`
  background: ${th('colorBackground')};
  display: flex;
  flex-direction: column;
  font-family: ${th('fontInterface')};
  font-size: ${th('fontSizeBase')};
  height: 100%;
  line-height: ${grid(4)};
  overflow: hidden;
  width: 100%;

  * {
    box-sizing: border-box;
  }
`;

const Main = styled.div`
  display: flex;
  flex-grow: 1;
  height: calc(100% - 40px);
`;

const TopMenu = styled.div`
  background: ${th('colorBackgroundToolBar')};
  border-bottom: ${th('borderWidth')} ${th('borderStyle')} ${th('colorBorder')};
  border-top: ${th('borderWidth')} ${th('borderStyle')} ${th('colorBorder')};
  display: flex;
  height: 40px;
  user-select: none;

  > div:not(:last-child) {
    border-right: ${th('borderWidth')} ${th('borderStyle')}
      ${th('colorFurniture')};
  }
`;

const EditorArea = styled.div`
  flex-grow: 1;
`;

const WaxSurfaceScroll = styled.div`
  box-sizing: border-box;
  display: flex;
  height: 100%;
  overflow-y: auto;
  position: fixed;
  top: 95px;
  width: 100%;
  /* PM styles  for main content*/
  ${EditorElements};
`;

const EditorContainer = styled.div`
  height: 100%;
  width: 100%;

  .ProseMirror {
    height: 100%;
    padding: ${grid(10)};
  }
`;

const MainMenuToolBar = ComponentPlugin('mainMenuToolBar');

const Layout = ({ editor }) => {

  return (
    <ThemeProvider theme={theme}>
      <Wrapper>
        <TopMenu>
          <MainMenuToolBar />
        </TopMenu>
        <Main>
          <EditorArea>
            <WaxSurfaceScroll>
              <EditorContainer>{editor}</EditorContainer>
            </WaxSurfaceScroll>
          </EditorArea>
        </Main>
      </Wrapper>
    </ThemeProvider>
  );
};

export default Layout;
