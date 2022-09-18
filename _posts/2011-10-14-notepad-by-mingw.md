---
layout: post
title: MinGW写的简易记事本 Ver0.02
tags: [MinGW,Notepad,Windows]
categories: [Program]
---


MinGW下编写的记事本，也可以认为是API编程，SDK编程什么的。反正是没使用MFC……我不是科班出身的，这些名词界限搞不懂……

<!--break-->

使用-mwindows参数编译…


```cpp
#define _UNICODE /* for std c */
#define UNICODE /* for windows api */

#include <stdio.h>
#include <time.h>
#include <tchar.h>
#include <sys/types.h>
#include <windowsx.h>
#include <windows.h>
#include <commdlg.h>
#include <commctrl.h>

/*============================================================================*/
/*DEBUG(Add the define below if need) */
#define DEBUG
VOID DEBUG_Output(TCHAR* lpszFormat, ...);

/*============================================================================*/
/*CTRL ID */
#define CTRL_ID_STATIC (0)
#define CTRL_ID_EDIT_TEXT (1)
#define CTRL_ID_EDIT_INPUT (2)
#define CTRL_ID_EDIT_REPLACE (3)
#define CTRL_ID_BTN_INPUT (4)
#define CTRL_ID_BTN_CANCEL (5)
#define CTRL_ID_STATUSBAR (6)

/*============================================================================*/
/*MENU ID */
#define MENU_ID_NEW (10)
#define MENU_ID_OPEN (11)
#define MENU_ID_SAVE (12)
#define MENU_ID_SAVEAS (13)
#define MENU_ID_EXIT (14)

#define MENU_ID_UNDO (20)
#define MENU_ID_COPY (21)
#define MENU_ID_PASTE (22)
#define MENU_ID_CUT (23)
#define MENU_ID_DEL (24)
#define MENU_ID_SELALL (25)
#define MENU_ID_GOTO (26)
#define MENU_ID_FIND (27)
#define MENU_ID_NEXT (28)
#define MENU_ID_REPLACE (29)
#define MENU_ID_DATE (30)

#define MENU_ID_WRET (40)

#define MENU_ID_ABOUT (50)

/*============================================================================*/
/* CONST DEFINE */
#define MAX_STRING (256)

/* The return value of the most APIs is limited in integer. */
/* So limit the max edit characters'' number to 65535 */
/* If need to deal with any files larger than 65535 bytes , */
/* Some complex arithmetics (i.e. column number) should to be added. */
#define MAX_EDIT (65535U)

/* One line''s one used for Goto and Find , two used for Repalce */
#define FLAG_INPUTDLG_ONELINE (0)
#define FLAG_INPUTDLG_TWOLINE (1)

#define FLAG_INPUTFLG_NONE (0)
#define FLAG_INPUTFLG_GOTO (1)
#define FLAG_INPUTFLG_FIND (2)
#define FLAG_INPUTFLG_REPLACE (3)

#ifdef UNICODE
#define SN_CF_TEXT (CF_UNICODETEXT)
#else
#define SN_CF_TEXT (CF_TEXT)
#endif

/*============================================================================*/
/* TYPEDEF */
typedef struct {
    UINT nID;
    TCHAR *pText;
} MenuString_st;

/*============================================================================*/
/* CONST VARIABLE */
const TCHAR *szClassName = TEXT("MySimpleNotepad");
const TCHAR *szCaptionMain = TEXT("Simple Notepad Ver0.02");
const TCHAR *szFind = TEXT("Find:");
const TCHAR *szReplace = TEXT("Replace:");
const TCHAR *szGoto = TEXT("Goto:");
const TCHAR *szError = TEXT("Error");
const TCHAR *szSaveModify = TEXT("Save the modify?");

const MenuString_st stMenuString[]= {
    {MENU_ID_NEW,TEXT("New a file.")},
    {MENU_ID_OPEN,TEXT("Open a file.")},
    {MENU_ID_SAVE,TEXT("Save the file.")},
    {MENU_ID_SAVEAS,TEXT("Save the texts to an other file.")}
};

/*============================================================================*/
/* VARIABLE */
HANDLE hInstance;
HWND hWinMain;
HWND hInputDlg;
HWND hWinStatus;

INT nInputDlgSts;

BOOL bUndo;
BOOL bWantReturn;

TCHAR cCrtFile[MAX_PATH];
TCHAR cInputEdit[MAX_STRING];

/*============================================================================*/
/* PROTOTYPE */
INT _WinMain(VOID);

LRESULT CALLBACK _ProcWinMain(HWND hWnd,DWORD uMsg,WPARAM wParam,LPARAM lParam);
LRESULT CALLBACK _ProcInputDlg(HWND hWnd,DWORD uMsg,WPARAM wParam,LPARAM lParam);
BOOL _PreTranslateMessage(MSG* pMsg);

HWND CreateEdit(DWORD dwStyle);
HWND CreatInputDlg(TCHAR* pTitle,INT nFlag);
HWND CreateStatusBar(VOID);
HMENU CreateMainMenu(VOID);
HACCEL CreateAccelerator(VOID);

VOID OnSetFocus(VOID);
VOID OnSize(VOID);
VOID OnAbout(VOID);
VOID OnQuit(VOID);
VOID OnNew(VOID);
VOID OnOpen(VOID);
VOID OnSave(INT nFlag);
VOID OnUndo(VOID);
VOID OnCopy(VOID);
VOID OnPaste(VOID);
VOID OnCut(VOID);
VOID OnDel(VOID);
VOID OnSelAll(VOID);
VOID OnWantReturn(VOID);
VOID OnGoto(INT nFlag);
VOID OnFind(INT nFlag);
VOID OnReplace(INT nFlag);
VOID OnDateTime(VOID);
VOID OnMenuSelect(UINT);

VOID OnEditCurMoved(VOID);

VOID OnInputDlgClose(HWND hWnd);
VOID OnInputDlgTab(VOID);

VOID ModifyWinTitle(VOID);
VOID OpenGivenFile(TCHAR *pFile);
BOOL Find(TCHAR tcFind[],DWORD *dwStart,DWORD *dwEnd);
BOOL Edit_GetSelText(HWND hWnd,TCHAR *pBuffer,INT nLenMax);

/*============================================================================*/
/* FUNCTION */
VOID ModifyWinTitle(VOID)
{
    TCHAR *cTitle;
    INT nSize = MAX_PATH + _tcslen(szCaptionMain)
                + 3 /* For the length of " - " */
                + 1; /* For the length of "*" */
    cTitle = malloc(nSize * sizeof(TCHAR));
    ZeroMemory(cTitle,nSize);
    _stprintf(cTitle,TEXT("%s%s - %s"),
              (_tcslen(cCrtFile)==0)?TEXT("Untitled"):cCrtFile,
              (Edit_GetModify(GetDlgItem(hWinMain,CTRL_ID_EDIT_TEXT))?TEXT("*"):TEXT("")),
              szCaptionMain);
    SetWindowText(hWinMain,cTitle);
    free(cTitle);
}

VOID OnSetFocus(VOID)
{
    if(GetFocus() != GetDlgItem(hWinMain,CTRL_ID_EDIT_TEXT)) {
        SetFocus(GetDlgItem(hWinMain,CTRL_ID_EDIT_TEXT));
    }
}

VOID OnSize(VOID)
{
    RECT stRect;
    RECT stRectSts;

    /* Keep the status at the bottom of the dlg */
    MoveWindow(hWinStatus,0,0,0,0,TRUE);

    /* Adjust the size of the edit ctrl */
    GetClientRect(hWinMain,&stRect);
    GetWindowRect(hWinStatus,&stRectSts);

    MoveWindow(GetDlgItem(hWinMain,CTRL_ID_EDIT_TEXT),/
               0,0,
               stRect.right-stRect.left,
               stRect.bottom-stRect.top-stRectSts.bottom+stRectSts.top,
               FALSE);

    /* Adjust the width of each part in the status dynamically */
    DWORD dwStatusWidth[] = {0,-1};
    dwStatusWidth[0] = stRect.right/3*2;
    SendMessage(hWinStatus,SB_SETPARTS,2,(LPARAM)dwStatusWidth);
}

VOID OnAbout(VOID)
{
    MessageBox(NULL,TEXT("Copyleft (C) 2010/n/nCompiler:MinGW-5.1.6[gcc version 3.4.5 (mingw-vista special r3) (with option -mwindows)]/n/nComment:The max file size is 65535 Bytes."),TEXT("About..."),MB_OK);
}

VOID OnQuit(VOID)
{
    if(Edit_GetModify(GetDlgItem(hWinMain,CTRL_ID_EDIT_TEXT))) {
        INT nID = MessageBox(NULL,szSaveModify,szCaptionMain,MB_OKCANCEL);
        if(IDOK == nID) {
            OnSave(0);
        }
    }
    else {
    }
    DestroyWindow(hWinMain);
    PostQuitMessage(0);
}

VOID OnNew(VOID)
{
    if(Edit_GetModify(GetDlgItem(hWinMain,CTRL_ID_EDIT_TEXT))) {
        INT nID = MessageBox(NULL,szSaveModify,szCaptionMain,MB_OKCANCEL);
        if(IDOK == nID) {
            OnSave(0);
        }
    }
    else {
    }
    SetWindowText(GetDlgItem(hWinMain,CTRL_ID_EDIT_TEXT),TEXT(""));
}

VOID OpenGivenFile(TCHAR *pFile)
{
    HANDLE hFile;
    DWORD dwSize,Num;
    CHAR *lpMultiByteStr;
    TCHAR *lpWideCharStr;

    hFile=CreateFile(pFile,GENERIC_READ,0,NULL,OPEN_ALWAYS,
                     FILE_ATTRIBUTE_NORMAL,NULL);
    if(INVALID_HANDLE_VALUE!= hFile )
    {
        SetFilePointer(hFile,0,0,FILE_BEGIN);

        dwSize = GetFileSize(hFile,NULL);

        lpMultiByteStr = malloc((dwSize+1) * sizeof(CHAR)); /*NOT sure if need to reserve a byte for ''/0'' */
        ZeroMemory(lpMultiByteStr,(dwSize+1) * sizeof(CHAR));

#ifdef UNICODE
        /* The text file is based on ansi , but the edit ctrl is based on unicode. */
        /* So need to convert the ansi strings to unicode format. */
        lpWideCharStr = malloc((dwSize+1) * sizeof(TCHAR)); /*NOT sure if need to reserve a byte for ''/0'' */
        ZeroMemory(lpWideCharStr,(dwSize+1) * sizeof(TCHAR));

        ReadFile(hFile,lpMultiByteStr,dwSize,&Num,NULL);

        MultiByteToWideChar(CP_ACP,MB_PRECOMPOSED,
                            lpMultiByteStr,(dwSize) * sizeof(CHAR),
                            lpWideCharStr,(dwSize) * sizeof(TCHAR));
#else
        lpWideCharStr = lpMultiByteStr;
#endif

        Edit_SetText(GetDlgItem(hWinMain,CTRL_ID_EDIT_TEXT),lpWideCharStr);

        free(lpMultiByteStr);
#ifdef UNICODE
        free(lpWideCharStr);
#endif
        CloseHandle(hFile);
    }

    ModifyWinTitle();

    SetFocus(GetDlgItem(hWinMain,CTRL_ID_EDIT_TEXT));
}

VOID OnOpen(VOID)
{
    if(Edit_GetModify(GetDlgItem(hWinMain,CTRL_ID_EDIT_TEXT))) {
        INT nID = MessageBox(NULL,szSaveModify,szCaptionMain,MB_OKCANCEL);
        if(IDOK == nID) {
            OnSave(0);
        }
    }
    else {
    }

    TCHAR *cFilter = TEXT("Non-Unicode Text File(*.txt)/0*.TXT/0");
    OPENFILENAME ofFile;

    memset(&ofFile,0,sizeof(OPENFILENAME));
    ofFile.lStructSize = sizeof(OPENFILENAME);
    ofFile.hwndOwner = hWinMain;
    ofFile.hInstance = hInstance;
    ofFile.lpstrFilter = cFilter;
    ofFile.lpstrTitle = TEXT("Open");
    ofFile.lpstrFile = cCrtFile;
    ofFile.nMaxFile = MAX_PATH;
    ofFile.Flags = OFN_PATHMUSTEXIST | OFN_FILEMUSTEXIST;

    if(GetOpenFileName(&ofFile)) {
        OpenGivenFile(cCrtFile);
    }

}

VOID OnSave(INT nFlag)
{
    if((nFlag) || (_tcslen(cCrtFile)==0)) {
        TCHAR *cFilter = TEXT("Non-Unicode Text File(*.txt)/0*.TXT/0");
        OPENFILENAME ofFile;

        memset(&ofFile,0,sizeof(OPENFILENAME));
        ofFile.lStructSize = sizeof(OPENFILENAME);
        ofFile.hwndOwner = hWinMain;
        ofFile.hInstance = hInstance;
        ofFile.lpstrFilter = cFilter;
        ofFile.lpstrTitle = TEXT("Save As");
        ofFile.lpstrFile = cCrtFile;
        ofFile.nMaxFile = MAX_PATH;
        ofFile.lpstrDefExt = TEXT(".txt");
        ofFile.Flags = OFN_PATHMUSTEXIST | OFN_FILEMUSTEXIST;

        GetSaveFileName(&ofFile);
    }
    else {
    }

    if(_tcslen(cCrtFile) != 0) {
        HANDLE hFile;
        DWORD dwSize,Num;
        CHAR *lpMultiByteStr;
        TCHAR *lpWideCharStr;
        hFile=CreateFile(cCrtFile,GENERIC_WRITE,0,NULL,CREATE_ALWAYS,
                         FILE_ATTRIBUTE_NORMAL,NULL);
        if(INVALID_HANDLE_VALUE!= hFile )
        {

            SetFilePointer(hFile,0,0,FILE_BEGIN);

            dwSize = Edit_GetTextLength(GetDlgItem(hWinMain,CTRL_ID_EDIT_TEXT))+1;

            lpWideCharStr = malloc((dwSize) * sizeof(TCHAR));
            ZeroMemory(lpWideCharStr,(dwSize) * sizeof(TCHAR));

#ifdef UNICODE
            /* The text file is based on ansi , but the edit ctrl is based on unicode. */
            /* So need to convert the unicode strings to ansi format. */
            lpMultiByteStr = malloc((dwSize) * sizeof(CHAR));
            ZeroMemory(lpMultiByteStr,(dwSize) * sizeof(CHAR));

            Edit_GetText(GetDlgItem(hWinMain,CTRL_ID_EDIT_TEXT),lpWideCharStr,dwSize);

            WideCharToMultiByte(CP_ACP,WC_COMPOSITECHECK,
                                lpWideCharStr,dwSize * sizeof(TCHAR),
                                lpMultiByteStr,dwSize * sizeof(CHAR),
                                NULL,NULL);
#else
            lpMultiByteStr = lpWideCharStr;
#endif

            WriteFile(hFile,lpMultiByteStr,dwSize,&Num,NULL);

#ifdef UNICODE
            free(lpMultiByteStr);
#endif
            free(lpWideCharStr);

            CloseHandle(hFile);

            Edit_SetModify(GetDlgItem(hWinMain,CTRL_ID_EDIT_TEXT),FALSE);
        }
    }

    ModifyWinTitle();
}

VOID OnUndo(VOID)
{
    Edit_Undo(GetDlgItem(hWinMain,CTRL_ID_EDIT_TEXT));
}

VOID OnCopy(VOID)
{
    TCHAR * pText;
    HANDLE hGlobal;
    PTSTR pGlobal ;
    DWORD dwGetSel;
    DWORD dwEditLen;

    dwGetSel = Edit_GetSel(GetDlgItem(hWinMain,CTRL_ID_EDIT_TEXT));
    dwEditLen = Edit_GetTextLength(GetDlgItem(hWinMain,CTRL_ID_EDIT_TEXT));

    pText = malloc((dwEditLen+1) * sizeof(TCHAR));
    Edit_GetText(GetDlgItem(hWinMain,CTRL_ID_EDIT_TEXT),pText,dwEditLen);

    hGlobal = GlobalAlloc (GHND | GMEM_SHARE, (HIWORD(dwGetSel) - LOWORD(dwGetSel) + 1) * sizeof (TCHAR)) ;
    pGlobal = GlobalLock (hGlobal) ;
    _tcsncpy (pGlobal, &pText[LOWORD(dwGetSel)],HIWORD(dwGetSel) - LOWORD(dwGetSel)) ;
    GlobalUnlock (hGlobal) ;
    OpenClipboard (hWinMain) ;
    EmptyClipboard () ;
    SetClipboardData (SN_CF_TEXT, hGlobal) ;
    CloseClipboard () ;
}

VOID OnPaste(VOID)
{
    HANDLE hGlobal;
    PTSTR pGlobal ;
    OpenClipboard (hWinMain) ;
    if (IsClipboardFormatAvailable (SN_CF_TEXT)) {
        hGlobal = GetClipboardData (SN_CF_TEXT);
        pGlobal = GlobalLock (hGlobal) ;
        Edit_ReplaceSel(GetDlgItem(hWinMain,CTRL_ID_EDIT_TEXT),pGlobal);
        GlobalUnlock (hGlobal) ;
    }
    CloseClipboard () ;

}

VOID OnCut(VOID)
{
    OnCopy();
    OnDel();
}

VOID OnDel(VOID)
{
    Edit_ReplaceSel(GetDlgItem(hWinMain,CTRL_ID_EDIT_TEXT),TEXT(""));
}

VOID OnSelAll(VOID)
{
    Edit_SetSel(GetDlgItem(hWinMain,CTRL_ID_EDIT_TEXT),
                0,
                Edit_GetTextLength(GetDlgItem(hWinMain,CTRL_ID_EDIT_TEXT)));
}

VOID OnWantReturn(VOID)
{
    DWORD dwStyle;

    bWantReturn = !bWantReturn;

    dwStyle = GetWindowLong(GetDlgItem(hWinMain,CTRL_ID_EDIT_TEXT),GWL_STYLE);
    if(bWantReturn) {
        dwStyle &= (~(ES_AUTOHSCROLL|WS_HSCROLL)) ;
    }
    else {
        dwStyle |= (ES_AUTOHSCROLL)|(WS_HSCROLL) ;
    }

    /* Cound not change the style after an edit-ctrl-created. */
    /* So need to re-create the edit ctrl for style changing. */
    DestroyWindow(GetDlgItem(hWinMain,CTRL_ID_EDIT_TEXT));
    CreateEdit(dwStyle);
    if(_tcslen(cCrtFile) != 0) {
        OpenGivenFile(cCrtFile);
    }
}

VOID OnDateTime(VOID)
{
    time_t t;
    struct tm *newtime;
    TCHAR tcDate[MAX_STRING];

    time(&t);
    newtime = localtime( &t );
    _stprintf(tcDate,TEXT("%02d:%02d %04d-%02d-%02d"),/
              newtime->tm_hour,newtime->tm_min,/
              newtime->tm_year+1900,newtime->tm_mon+1, newtime->tm_mday
             );
    Edit_ReplaceSel(GetDlgItem(hWinMain,CTRL_ID_EDIT_TEXT),tcDate);
}

VOID OnEditCurMoved(VOID)
{
    INT nRow,nCol;
    TCHAR tcBuff[MAX_STRING];

    /* Use EM_LINEFROMCHAR to get the current line. */
    nRow = Edit_LineFromChar(GetDlgItem(hWinMain,CTRL_ID_EDIT_TEXT),-1);
    /* We could get the index of the current charactor in an edit ctrl (A)
    and the count of the charactors till the last line (B)
    So the value of A-B would be the column.*/
    nCol = HIWORD(Edit_GetSel(GetDlgItem(hWinMain,CTRL_ID_EDIT_TEXT))) - /
           Edit_LineIndex(GetDlgItem(hWinMain,CTRL_ID_EDIT_TEXT),-1);
    _stprintf(tcBuff,TEXT("Ln %d, Col %d"),nRow+1,nCol+1);

    /* Used to update the Line and column info in status bar. */
    SendMessage(hWinStatus,SB_SETTEXT,1,(LPARAM)tcBuff);

}

VOID OnMenuSelect(UINT uItem)
{
    INT n,nIdCnt = sizeof(stMenuString)/sizeof(stMenuString[0]);

    /* Used to update the menu hint info in status bar. */
    for(n=0; n<nIdCnt; n++) {
        if(uItem == stMenuString[n].nID) {
            SendMessage(hWinStatus,SB_SETTEXT,0,(LPARAM)stMenuString[n].pText);
            break;
        }
    }

    if(n >= nIdCnt) {
        SendMessage(hWinStatus,SB_SETTEXT,0,(LPARAM)TEXT(""));
    }
}

LRESULT CALLBACK _ProcWinMain(HWND hWnd,DWORD uMsg,WPARAM wParam,LPARAM lParam)
{
    if(WM_SIZE == uMsg) {
        OnSize();
    }
    else if(WM_CLOSE == uMsg) {
        OnQuit();
    }
    else if(WM_SETFOCUS == uMsg) {
        OnSetFocus();
    }
    else if(WM_INITMENUPOPUP == uMsg) {
//if((UINT) LOWORD(lParam) == 1){
        BOOL bEnable;
        bEnable = (Edit_GetSel(GetDlgItem(hWinMain,CTRL_ID_EDIT_TEXT)) != 0) ? MF_ENABLED : MF_GRAYED ;
        EnableMenuItem ((HMENU) wParam, MENU_ID_UNDO, bUndo ? MF_ENABLED : MF_GRAYED) ;
        EnableMenuItem ((HMENU) wParam, MENU_ID_PASTE, IsClipboardFormatAvailable (SN_CF_TEXT) ? MF_ENABLED : MF_GRAYED) ;
        EnableMenuItem ((HMENU) wParam, MENU_ID_CUT, bEnable) ;
        EnableMenuItem ((HMENU) wParam, MENU_ID_COPY, bEnable) ;
        EnableMenuItem ((HMENU) wParam, MENU_ID_DEL, bEnable) ;
//}

        CheckMenuItem((HMENU) wParam,MENU_ID_WRET, bWantReturn?MF_CHECKED:MF_UNCHECKED);
    }
    else if(WM_MENUSELECT == uMsg) {
        OnMenuSelect((UINT) LOWORD(wParam));
    }
    else if(WM_DROPFILES == uMsg) {
        TCHAR lpszFileName[MAX_PATH];
        DragQueryFile((HANDLE)wParam, 0, lpszFileName, MAX_PATH);
        OpenGivenFile(lpszFileName);
        _tcscpy(cCrtFile,lpszFileName);
    }
    else if((WM_COMMAND == uMsg)/*&&(HIWORD(wParam) == BN_CLICKED)*/) {
        WORD wNotifyCode = HIWORD(wParam); // notification code
        WORD wID = LOWORD(wParam); // item, control, or accelerator identifier
        HWND hCtl = (HWND) lParam; // handle of control
        /*if(HIWORD(wParam) == BN_CLICKED){*/
        switch(wID) {
        case MENU_ID_ABOUT:
            OnAbout();
            break;
        case MENU_ID_EXIT:
            OnQuit();
            break;
        case MENU_ID_NEW:
            OnNew();
            break;
        case MENU_ID_OPEN:
            OnOpen();
            break;
        case MENU_ID_SAVE:
            OnSave(0);
            break;
        case MENU_ID_SAVEAS:
            OnSave(1);
            break;
        case MENU_ID_UNDO:
            OnUndo();
            break;
        case MENU_ID_COPY:
            OnCopy();
            break;
        case MENU_ID_PASTE:
            OnPaste();
            break;
        case MENU_ID_CUT:
            OnCut();
            break;
        case MENU_ID_DEL:
            OnDel();
            break;
        case MENU_ID_SELALL:
            OnSelAll();
            break;
        case MENU_ID_WRET:
            OnWantReturn();
            break;
        case MENU_ID_GOTO:
            OnGoto(0);
            break;
        case MENU_ID_FIND:
            OnFind(0);
            break;
        case MENU_ID_NEXT:
            OnFind(1);
            break;
        case MENU_ID_REPLACE:
            OnReplace(0);
            break;
        case MENU_ID_DATE:
            OnDateTime();
            break;
        default:
            DefWindowProc(hWnd,uMsg,wParam,lParam);
            break;
        }
        /*}
        else */if(EN_CHANGE == HIWORD(wParam)) {
            ModifyWinTitle();
            bUndo = TRUE;
        }
        else {
            DefWindowProc(hWnd,uMsg,wParam,lParam);
        }

    }
    else {
        DefWindowProc(hWnd,uMsg,wParam,lParam);
    }

}

VOID OnGoto(INT nFlag)
{
    INT nLine;
    TCHAR cBuff[MAX_STRING];

    if(0 == nFlag) {
        nInputDlgSts = FLAG_INPUTFLG_GOTO;
        CreatInputDlg(TEXT("Goto:"),FLAG_INPUTDLG_ONELINE);
        /* Set the current line number to default */
        nLine = Edit_LineFromChar(GetDlgItem(hWinMain,CTRL_ID_EDIT_TEXT),-1) + 1;
        _itot(nLine,cBuff,10);
        Edit_SetText(GetDlgItem(hInputDlg,CTRL_ID_EDIT_INPUT),cBuff);
    }
    else {
        Edit_GetText(GetDlgItem(hInputDlg,CTRL_ID_EDIT_INPUT),cInputEdit,MAX_STRING);
        nLine = Edit_LineIndex(GetDlgItem(hWinMain,CTRL_ID_EDIT_TEXT),_ttoi(cInputEdit)-1);
        Edit_SetSel(GetDlgItem(hWinMain,CTRL_ID_EDIT_TEXT),nLine,nLine);
        SetFocus(GetDlgItem(hWinMain,CTRL_ID_EDIT_TEXT));
    }
}

BOOL Find(TCHAR tcFind[],DWORD *dwStart,DWORD *dwEnd)
{
    DWORD dwSize,Num;
    DWORD dwFindStart;
    TCHAR *cBuffer;
    BOOL bRet = FALSE;

    dwSize = Edit_GetTextLength(GetDlgItem(hWinMain,CTRL_ID_EDIT_TEXT))+1;
    cBuffer = malloc(dwSize * sizeof(TCHAR));
    ZeroMemory(cBuffer,dwSize * sizeof(TCHAR));

    Edit_GetText(GetDlgItem(hWinMain,CTRL_ID_EDIT_TEXT),cBuffer,dwSize);

    dwFindStart = Edit_GetSel(GetDlgItem(hWinMain,CTRL_ID_EDIT_TEXT));
    dwFindStart = HIWORD(dwFindStart);

    if(dwFindStart < dwSize) {
        TCHAR *pFound = _tcsstr(cBuffer+dwFindStart,tcFind);
        if(pFound != NULL) {
            *dwStart = (DWORD)pFound - (DWORD)cBuffer;
            *dwEnd = *dwStart + _tcslen(tcFind);
            bRet = TRUE;
        }
    }
    free(cBuffer);

    return bRet;
}

BOOL Edit_GetSelText(HWND hWnd,TCHAR *pBuffer,INT nLenMax)
{
    BOOL bRet = TRUE;

    if(Edit_GetSel(hWnd) != 0) {
        TCHAR * pText;
        DWORD dwGetSel;
        DWORD dwEditLen;
        DWORD dwSelLen;

        dwGetSel = Edit_GetSel(hWnd);
        dwEditLen = Edit_GetTextLength(hWnd);

        pText = malloc((dwEditLen+1) * sizeof(TCHAR));
        Edit_GetText(hWnd,pText,dwEditLen);

        dwSelLen = HIWORD(dwGetSel) - LOWORD(dwGetSel);
        dwSelLen = (nLenMax > dwSelLen)?dwSelLen:nLenMax;

        _tcsncpy (pBuffer, &pText[LOWORD(dwGetSel)],dwSelLen) ;
    }
    else {
        bRet = FALSE;
    }
}

VOID OnFind(INT nFlag)
{
    static TCHAR cString[MAX_STRING] = TEXT("");

    DWORD dwStart,dwEnd;

    if(0 == nFlag) {
        nInputDlgSts = FLAG_INPUTFLG_FIND;
        CreatInputDlg(_T("Find:"),FLAG_INPUTDLG_ONELINE);
        /* Set the selected text to default */
        Edit_GetSelText(GetDlgItem(hWinMain,CTRL_ID_EDIT_TEXT),cString,MAX_STRING);
        Edit_SetText(GetDlgItem(hInputDlg,CTRL_ID_EDIT_INPUT),cString);
    }
    else {
        if(GetDlgItem(hInputDlg,CTRL_ID_EDIT_INPUT)!=NULL) {
            Edit_GetText(GetDlgItem(hInputDlg,CTRL_ID_EDIT_INPUT),cString,MAX_STRING);
        }

        BOOL bFind = Find(cString,&dwStart,&dwEnd);

        if(bFind) {
            Edit_SetSel(GetDlgItem(hWinMain,CTRL_ID_EDIT_TEXT),dwStart,dwEnd);
        }
        else {
            TCHAR tcCaution[MAX_STRING] = TEXT("Can not find /"");
                                               _tcscat(tcCaution,cString);
                                               _tcscat(tcCaution,TEXT("/"!"));
                                                       MessageBox(NULL,tcCaution,szCaptionMain,MB_OK);
        }

    }
}

                              VOID OnReplace(INT nFlag)
{
    static TCHAR cFind[MAX_STRING] = TEXT("");
    static TCHAR cReplace[MAX_STRING] = TEXT("");

    DWORD dwStart,dwEnd;

    if(0 == nFlag) {
        nInputDlgSts = FLAG_INPUTFLG_REPLACE;
        CreatInputDlg(_T("Replace:"),FLAG_INPUTDLG_TWOLINE);
        /* Set the selected text to default */
        Edit_GetSelText(GetDlgItem(hWinMain,CTRL_ID_EDIT_TEXT),cFind,MAX_STRING);
        Edit_SetText(GetDlgItem(hInputDlg,CTRL_ID_EDIT_INPUT),cFind);
        Edit_SetText(GetDlgItem(hInputDlg,CTRL_ID_EDIT_REPLACE),cReplace);
    }
    else {
        Edit_GetText(GetDlgItem(hInputDlg,CTRL_ID_EDIT_INPUT),cFind,MAX_STRING);
        Edit_GetText(GetDlgItem(hInputDlg,CTRL_ID_EDIT_REPLACE),cReplace,MAX_STRING);

        BOOL bFind = Find(cFind,&dwStart,&dwEnd);

        if(bFind) {
            Edit_SetSel(GetDlgItem(hWinMain,CTRL_ID_EDIT_TEXT),dwStart,dwEnd);
            Edit_ReplaceSel(GetDlgItem(hWinMain,CTRL_ID_EDIT_TEXT),cReplace);
        }
        else {
            TCHAR tcCaution[MAX_STRING] = TEXT("Can not find /"");
                                               _tcscat(tcCaution,cFind);
                                               _tcscat(tcCaution,TEXT("/"!"));
                                                       MessageBox(NULL,tcCaution,szCaptionMain,MB_OK);
        }

    }
}

                              VOID OnInputDlgClose(HWND hWnd)
{
    nInputDlgSts = FLAG_INPUTFLG_NONE;
    DestroyWindow(hWnd);
    hInputDlg = NULL;
    SetFocus(GetDlgItem(hWinMain,CTRL_ID_EDIT_TEXT));
}

VOID OnInputDlgTab(VOID)
{
    /* Tab order */
    INT nIdTab[][2]= {
        {CTRL_ID_EDIT_INPUT,CTRL_ID_EDIT_REPLACE },
        {CTRL_ID_EDIT_REPLACE,CTRL_ID_BTN_INPUT },
        {CTRL_ID_BTN_INPUT,CTRL_ID_BTN_CANCEL },
        {CTRL_ID_BTN_CANCEL,CTRL_ID_EDIT_INPUT }
    };
    INT n,nIdCnt = sizeof(nIdTab)/sizeof(nIdTab[0]);

    INT nID = GetWindowLong(GetFocus(),GWL_ID);

    for(n=0; n<nIdCnt; n++) {
        if(nID == nIdTab[n][0]) {
            if(GetDlgItem(hInputDlg,nIdTab[n][1])!= NULL) {
                SetFocus(GetDlgItem(hInputDlg,nIdTab[n][1]));
                break;
            }
            else {
                nID = nIdTab[n][1];
            }
        }
    }
}

LRESULT CALLBACK _ProcInputDlg(HWND hWnd,DWORD uMsg,WPARAM wParam,LPARAM lParam)
{
    if(WM_PAINT == uMsg) {
        UpdateWindow(hWnd);
    }
    else if(WM_CLOSE == uMsg) {
        OnInputDlgClose(hWnd);
    }
    else if(WM_KEYDOWN == uMsg) {
        INT nVirtKey =(INT) wParam;

        if(nVirtKey == VK_ESCAPE) {
            SendMessage(hWnd,WM_COMMAND,MAKELONG(CTRL_ID_BTN_CANCEL,BN_CLICKED),CTRL_ID_BTN_INPUT);
        }
        else if(nVirtKey == VK_RETURN) {
            SendMessage(hWnd,WM_COMMAND,MAKELONG(CTRL_ID_BTN_INPUT,BN_CLICKED),CTRL_ID_BTN_INPUT);
        }
    }
    else if((WM_COMMAND == uMsg)/*&&(HIWORD(wParam) == BN_CLICKED)*/) {
        WORD wNotifyCode = HIWORD(wParam); // notification code
        WORD wID = LOWORD(wParam); // item, control, or accelerator identifier
        HWND hCtl = (HWND) lParam; // handle of control
        switch(wID) {
        case CTRL_ID_BTN_INPUT:
            if(FLAG_INPUTFLG_GOTO == nInputDlgSts) {
                OnGoto(1);
                OnInputDlgClose(hWnd);
            }
            else if(FLAG_INPUTFLG_FIND == nInputDlgSts) {
                OnFind(1);
            }
            else if(FLAG_INPUTFLG_REPLACE == nInputDlgSts) {
                OnReplace(1);
            }
            else {
            }
            break;
        case CTRL_ID_BTN_CANCEL:
            OnInputDlgClose(hWnd);
            break;
        default:
            DefWindowProc(hWnd,uMsg,wParam,lParam);
            break;
        }
    }
    else {
//DefWindowProc(hWnd,uMsg,wParam,lParam);
    }

    DefWindowProc(hWnd,uMsg,wParam,lParam);
}

HMENU CreateMainMenu(VOID)
{
    HMENU hMenu = CreateMenu();
    HMENU hFile = CreateMenu();
    HMENU hEdit = CreateMenu();
    HMENU hForm = CreateMenu();
    HMENU hHelp = CreateMenu();

    if(hMenu&&hFile) {
        AppendMenu(hFile,MF_STRING,MENU_ID_NEW,TEXT("&New Ctrl + N"));
        AppendMenu(hFile,MF_STRING,MENU_ID_OPEN,TEXT("&Open... Ctrl + O"));
        AppendMenu(hFile,MF_STRING,MENU_ID_SAVE,TEXT("&Save Ctrl + S"));
        AppendMenu(hFile,MF_STRING,MENU_ID_SAVEAS,TEXT("Save &As..."));
        AppendMenu(hFile,MF_SEPARATOR,0,TEXT(""));
        AppendMenu(hFile,MF_STRING,MENU_ID_EXIT,TEXT("E&xit"));

        AppendMenu(hEdit,MF_STRING,MENU_ID_UNDO,TEXT("&Undo Ctrl + Z"));
        AppendMenu(hEdit,MF_SEPARATOR,0,TEXT(""));
        AppendMenu(hEdit,MF_STRING,MENU_ID_CUT,TEXT("Cu&t Ctrl + X"));
        AppendMenu(hEdit,MF_STRING,MENU_ID_COPY,TEXT("&Copy Ctrl + C"));
        AppendMenu(hEdit,MF_STRING,MENU_ID_PASTE,TEXT("&Paste Ctrl + V"));
        AppendMenu(hEdit,MF_STRING,MENU_ID_DEL,TEXT("De&l Del"));
        AppendMenu(hEdit,MF_SEPARATOR,0,TEXT(""));
        AppendMenu(hEdit,MF_STRING,MENU_ID_FIND,TEXT("&Find Ctrl + F"));
        AppendMenu(hEdit,MF_STRING,MENU_ID_NEXT,TEXT("Find &Next F3"));
        AppendMenu(hEdit,MF_STRING,MENU_ID_REPLACE,TEXT("&Replace Ctrl + H"));
        AppendMenu(hEdit,MF_STRING,MENU_ID_GOTO,TEXT("&Goto Ctrl + G"));
        AppendMenu(hEdit,MF_SEPARATOR,0,TEXT(""));
        AppendMenu(hEdit,MF_STRING,MENU_ID_SELALL,TEXT("Select &All Ctrl + A"));
        AppendMenu(hEdit,MF_STRING,MENU_ID_DATE,TEXT("&Date/Time F5"));

        AppendMenu(hForm,MF_STRING,MENU_ID_WRET,TEXT("&Want Return"));

        AppendMenu(hHelp,MF_STRING,MENU_ID_ABOUT,TEXT("&About"));

        AppendMenu(hMenu,MF_POPUP,(UINT)hFile,TEXT("&File"));
        AppendMenu(hMenu,MF_POPUP,(UINT)hEdit,TEXT("&Edit"));
        AppendMenu(hMenu,MF_POPUP,(UINT)hForm,TEXT("F&ormat"));
        AppendMenu(hMenu,MF_POPUP,(UINT)hHelp,TEXT("&Help"));
    }

    return hMenu;
}

HACCEL CreateAccelerator(VOID)
{
    ACCEL accel[] =
    {
        { FVIRTKEY, VK_F3, MENU_ID_NEXT },
        { FVIRTKEY, VK_F5, MENU_ID_DATE },

        { FCONTROL | FVIRTKEY, TEXT(''S''), MENU_ID_SAVE },
        { FCONTROL | FVIRTKEY, TEXT(''N''), MENU_ID_NEW },
        { FCONTROL | FVIRTKEY, TEXT(''O''), MENU_ID_OPEN },
        { FCONTROL | FVIRTKEY, TEXT(''C''), MENU_ID_COPY },
        { FCONTROL | FVIRTKEY, TEXT(''V''), MENU_ID_PASTE },
        { FCONTROL | FVIRTKEY, TEXT(''X''), MENU_ID_CUT },
        { FCONTROL | FVIRTKEY, TEXT(''Z''), MENU_ID_UNDO },
        { FCONTROL | FVIRTKEY, TEXT(''A''), MENU_ID_SELALL },
        { FCONTROL | FVIRTKEY, TEXT(''F''), MENU_ID_FIND },
        { FCONTROL | FVIRTKEY, TEXT(''H''), MENU_ID_REPLACE },
        { FCONTROL | FVIRTKEY, TEXT(''G''), MENU_ID_GOTO },
    };
    INT nCnt = sizeof(accel)/sizeof(accel[0]);

    return CreateAcceleratorTable(accel, nCnt);

}

HWND CreateEdit(DWORD dwStyle)
{
    HWND hWnd;
    RECT rect;

    GetClientRect(hWinMain,&rect);
    hWnd = CreateWindow(TEXT("Edit"),TEXT(""),/
                        dwStyle,/
                        0,0,rect.right-rect.left,rect.bottom-rect.top,/
                        hWinMain,(HMENU)CTRL_ID_EDIT_TEXT,hInstance,NULL);
    Edit_CanUndo(hWnd);
    SendMessage(hWnd,EM_SETLIMITTEXT,MAX_EDIT,0);
}

HWND CreateStatusBar(VOID)
{
    hWinStatus = CreateWindowEx(0,
                                TEXT("msctls_statusbar32"),NULL,/
                                WS_CHILD | WS_VISIBLE | SBS_SIZEGRIP,/
                                0,0,0,0,/
                                hWinMain,(HMENU)CTRL_ID_STATUSBAR,hInstance,NULL);
}

HWND CreatInputDlg(TCHAR* pTitle,INT nFlag)
{
    TCHAR *pClassName = TEXT("MyInputDlg");
    const TCHAR *pStatic = szError;

    WNDCLASSEX stWndClass;
    MSG stMsg;
    HWND hNewWnd;
    RECT rect;

    INT nDlgX = 200;
    INT nDlgY = 200;
    INT nDlgW = 160;
    INT nDlgH = 120;

    INT nCtrlH = 24;
    INT nStaticX = 10;
    INT nEditX = 50;
    INT nLine1Y = 15;
    INT nLine2Y = 50;
    INT nStaticW = 35;
    INT nEditW = 90;

    INT nButtonW = 60;
    INT nButtonY = 50;
    INT nButton1X = 10;
    INT nButton2X = nDlgW - nButtonW - nButton1X*2;

    if(FLAG_INPUTDLG_TWOLINE == nFlag) {
        nDlgH += (10 + nCtrlH);
        nButtonY += (10 + nCtrlH);
        nStaticW += 35;
        nEditX += 35;
        nDlgW += 35;
        nButton2X += 35;
    }

    RtlZeroMemory(&stWndClass,sizeof(stWndClass));
    stWndClass.hCursor = LoadCursor(0,IDC_ARROW);
    stWndClass.hInstance = GetModuleHandle(NULL);
    stWndClass.cbSize = sizeof(WNDCLASSEX);
    stWndClass.style = CS_HREDRAW | CS_VREDRAW;
    stWndClass.lpfnWndProc = (WNDPROC)_ProcInputDlg;
    stWndClass.hbrBackground = (HBRUSH)(COLOR_WINDOW + 1);
    stWndClass.lpszClassName = pClassName;

    RegisterClassEx(&stWndClass);

    hInputDlg = CreateWindowEx(WS_EX_CLIENTEDGE,
                               pClassName,pTitle,/
                               WS_OVERLAPPEDWINDOW,/
                               nDlgX,nDlgY,nDlgW,nDlgH,/
                               NULL,NULL,hInstance,NULL);

    if(FLAG_INPUTFLG_GOTO == nInputDlgSts) {
        pStatic = szGoto;
    }
    else if(FLAG_INPUTFLG_FIND == nInputDlgSts) {
        pStatic = szFind;
    }
    else if(FLAG_INPUTFLG_REPLACE == nInputDlgSts) {
        pStatic = szFind;
    }
    else {
    }
    hNewWnd = CreateWindow(TEXT("Static"),pStatic,/
                           WS_CHILDWINDOW|WS_VISIBLE|WS_BORDER,/
                           nStaticX,nLine1Y,nStaticW,nCtrlH,/
                           hInputDlg,(HMENU)CTRL_ID_STATIC,hInstance,NULL);
    ShowWindow(hNewWnd,SW_SHOWNORMAL);

    hNewWnd = CreateWindow(TEXT("Edit"),TEXT(""),/
                           WS_CHILDWINDOW|WS_VISIBLE|WS_BORDER|WS_TABSTOP,/
                           nEditX,nLine1Y,nEditW,nCtrlH,/
                           hInputDlg,(HMENU)CTRL_ID_EDIT_INPUT,hInstance,NULL);
    SetFocus(hNewWnd);
    ShowWindow(hNewWnd,SW_SHOWNORMAL);

    if(FLAG_INPUTDLG_TWOLINE == nFlag) {
        hNewWnd = CreateWindow(TEXT("Static"),szReplace,/
                               WS_CHILDWINDOW|WS_VISIBLE|WS_BORDER,/
                               nStaticX,nLine2Y,nStaticW,nCtrlH,/
                               hInputDlg,(HMENU)CTRL_ID_STATIC,hInstance,NULL);
        ShowWindow(hNewWnd,SW_SHOWNORMAL);

        hNewWnd = CreateWindow(TEXT("Edit"),TEXT(""),/
                               WS_CHILDWINDOW|WS_VISIBLE|WS_BORDER|WS_TABSTOP,/
                               nEditX,nLine2Y,nEditW,nCtrlH,/
                               hInputDlg,(HMENU)CTRL_ID_EDIT_REPLACE,hInstance,NULL);
        ShowWindow(hNewWnd,SW_SHOWNORMAL);
    }

    hNewWnd = CreateWindow(TEXT("Button"),TEXT("&OK"),/
                           WS_CHILDWINDOW|WS_VISIBLE|WS_GROUP|WS_TABSTOP,/
                           nButton1X,nButtonY,nButtonW,nCtrlH,/
                           hInputDlg,(HMENU)CTRL_ID_BTN_INPUT,hInstance,NULL);
    ShowWindow(hNewWnd,SW_SHOWNORMAL);

    hNewWnd = CreateWindow(TEXT("Button"),TEXT("&Cancel"),/
                           WS_CHILDWINDOW|WS_VISIBLE|WS_GROUP|WS_TABSTOP,/
                           nButton2X,nButtonY,nButtonW,nCtrlH,/
                           hInputDlg,(HMENU)CTRL_ID_BTN_CANCEL,hInstance,NULL);
    ShowWindow(hNewWnd,SW_SHOWNORMAL);

    ShowWindow(hInputDlg,SW_SHOWNORMAL);
    UpdateWindow(hInputDlg);

    return hInputDlg;
}

BOOL _PreTranslateMessage(MSG* pMsg)
{
    BOOL bRet = TRUE;
    if((NULL != hInputDlg)&&(WM_KEYDOWN == pMsg->message)) {
        if((VK_RETURN == pMsg->wParam)||
                (VK_ESCAPE == pMsg->wParam)
          ) {
            SendMessage(hInputDlg,pMsg->message,pMsg->wParam,pMsg->lParam);
        }
        else if(VK_TAB == pMsg->wParam) {
            OnInputDlgTab();
            bRet = FALSE;
        }
    }

    if((GetDlgItem(hWinMain,CTRL_ID_EDIT_TEXT) == pMsg->hwnd)&&
            ((WM_KEYUP == pMsg->message)||(WM_LBUTTONUP == pMsg->message))) {
        OnEditCurMoved();
    }

    if(WM_DROPFILES == pMsg->message) {
        SendMessage(hWinMain,pMsg->message,pMsg->wParam,pMsg->lParam);
    }

    return bRet;
}

INT _WinMain(VOID)
{
    MSG stMsg;
    HWND hNewWnd;
    HMENU hMenu;
    HACCEL hAccelerator;
    WNDCLASSEX stWndClass;

    hMenu = CreateMainMenu();
    hAccelerator = CreateAccelerator();
    hInstance = GetModuleHandle(NULL);

    memset(&stWndClass,0,sizeof(stWndClass));
    stWndClass.hCursor = LoadCursor(0,IDC_ARROW);
    stWndClass.hInstance = hInstance;
    stWndClass.cbSize = sizeof(WNDCLASSEX);
    stWndClass.style = CS_HREDRAW | CS_VREDRAW;
    stWndClass.lpfnWndProc = (WNDPROC)_ProcWinMain;
    stWndClass.hbrBackground = (HBRUSH)(COLOR_WINDOW + 1);
    stWndClass.lpszClassName = szClassName;

    RegisterClassEx(&stWndClass);

    hWinMain = CreateWindowEx(WS_EX_CLIENTEDGE|WS_EX_ACCEPTFILES,/
                              szClassName,szCaptionMain,/
                              WS_OVERLAPPEDWINDOW,/
                              100,100,600,400,/
                              NULL,hMenu,hInstance,hAccelerator);
    ModifyWinTitle();

    hNewWnd = CreateEdit(WS_CHILDWINDOW|WS_VISIBLE|ES_MULTILINE|ES_WANTRETURN|/
                         ES_AUTOHSCROLL|ES_AUTOVSCROLL|WS_VSCROLL|WS_HSCROLL);
    SetFocus(GetDlgItem(hWinMain,CTRL_ID_EDIT_TEXT));

    CreateStatusBar();

    OpenGivenFile(cCrtFile);

    ShowWindow(hWinMain,SW_SHOWNORMAL);
    UpdateWindow(hWinMain);

    while(TRUE) {

        if(GetMessage(&stMsg,NULL,0,0)==0) {
            break;
        }

        if(!(TranslateAccelerator(hWinMain,hAccelerator,&stMsg))) {
            TranslateMessage(&stMsg);
            if(_PreTranslateMessage(&stMsg)) {
                DispatchMessage(&stMsg);
            }
        }

    }

    return 0;

}

/* There is no wmain in mingw 5.1.6 */
/* I find a "#if 0" in tchar.h , but don''t know why ... */
INT main(INT argc, TCHAR *argv[ ], CHAR *env[])
{
    bUndo = FALSE;
    bWantReturn = FALSE;

    hInputDlg = NULL;
    hInstance = NULL;
    hWinMain = NULL;
    hWinStatus = NULL;

    nInputDlgSts = FLAG_INPUTFLG_NONE;

    memset(cCrtFile,0,sizeof(cCrtFile));
    memset(cInputEdit,0,sizeof(cInputEdit));

    if(argc > 1) {
#ifdef UNICODE
        /* The command line is in ansi format , need convert. */
        INT nSize = _tcslen(argv[1])* sizeof(TCHAR);
        MultiByteToWideChar(CP_ACP,MB_PRECOMPOSED,
                            (CHAR*)argv[1],nSize,
                            cCrtFile,nSize * sizeof(TCHAR));
#else
        _tcscpy(cCrtFile,argv[1]);
#endif
    }

    _WinMain();
    ExitProcess(0);

    return 0;
}

VOID DEBUG_Output(TCHAR* lpszFormat, ...)
{
#ifdef DEBUG
    TCHAR tcBuff[MAX_STRING];
    va_list args;

    va_start(args, lpszFormat);
    _vstprintf(tcBuff,lpszFormat,args);
    va_end(args);

    MessageBox(NULL,tcBuff,TEXT("DEBUG"),MB_OK);
#endif
}
```

PS：这么长的代码几乎没有注释……汗啊！
